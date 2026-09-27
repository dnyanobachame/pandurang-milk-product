-- ============================================================================
-- PRODUCT MANAGEMENT — schema additions + Storage bucket/policies
-- Run in the Supabase SQL editor (production DB), after 12_security_fixes.sql.
--
-- Inspected the existing `products` table first (01_schema.sql) — it
-- already has name, category_id, sku, description, image_url, unit,
-- selling_price, mrp, available_quantity (stock), min_stock_level (low
-- stock threshold), is_active, delivery_available, created_at/updated_at.
-- Reused all of those rather than duplicating. Only genuinely missing
-- columns are added below.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. NEW COLUMNS
-- ----------------------------------------------------------------------------
-- SKU should be genuinely optional (per spec: "SKU must be unique IF SKU
-- exists") — the original schema had it NOT NULL, which the admin form
-- can't honor without either forcing a fake value or relaxing this.
alter table products alter column sku drop not null;

alter table products add column if not exists slug text;
alter table products add column if not exists short_description text;
alter table products add column if not exists ingredients text;
alter table products add column if not exists discount_type text
  check (discount_type in ('percentage', 'fixed'));
alter table products add column if not exists discount_value numeric(10,2)
  not null default 0 check (discount_value >= 0);
alter table products add column if not exists is_featured boolean not null default false;
alter table products add column if not exists display_order int not null default 0;
alter table products add column if not exists min_order_quantity numeric(10,2)
  not null default 1 check (min_order_quantity >= 1);
alter table products add column if not exists max_order_quantity numeric(10,2);
alter table products add column if not exists pickup_available boolean not null default false;
-- Latur is the current business's only delivery district today, but this
-- is a per-product array (not hardcoded into queries) so adding another
-- district later is a data change, not a code change.
alter table products add column if not exists delivery_districts text[]
  not null default array['Latur'];

alter table products add constraint products_mrp_gte_price
  check (mrp is null or mrp >= selling_price) not valid;
alter table products validate constraint products_mrp_gte_price;

alter table products add constraint products_max_gte_min_qty
  check (max_order_quantity is null or max_order_quantity >= min_order_quantity) not valid;
alter table products validate constraint products_max_gte_min_qty;

-- ----------------------------------------------------------------------------
-- 2. SLUG GENERATION — auto-derive from name, unique, human-readable
-- ----------------------------------------------------------------------------
create or replace function slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g')
  );
$$;

create or replace function set_product_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  suffix int := 1;
begin
  -- Only regenerate when slug is empty or the name changed and no
  -- explicit slug was provided in this update.
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;

  base_slug := slugify(new.name);
  candidate := base_slug;

  while exists (
    select 1 from products
    where slug = candidate and id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate := base_slug || '-' || suffix;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists trg_set_product_slug on products;
create trigger trg_set_product_slug
  before insert or update on products
  for each row execute function set_product_slug();

-- Backfill slugs for any existing products (the seeded demo products).
update products set slug = null where slug is null; -- no-op, forces trigger below
update products set updated_at = updated_at where slug is null;

create unique index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_featured on products(is_featured, display_order);

-- ----------------------------------------------------------------------------
-- 3. STORAGE — dedicated public bucket for product images only
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Anyone can view product images (they're already public product photos).
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Only admin (or roles authorized to manage the catalog) can upload,
-- replace, or delete — mirrors products_staff_write's role set.
create policy "product_images_staff_write" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
  );

create policy "product_images_staff_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
  );

create policy "product_images_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
  );

-- ----------------------------------------------------------------------------
-- 4. Explicit WITH CHECK on the existing staff-write policy, so INSERTs
-- are validated the same way as everything else `products_staff_write`
-- already covers (it previously relied on USING doubling as the implicit
-- WITH CHECK, which works but wasn't explicit).
-- ----------------------------------------------------------------------------
drop policy if exists "products_staff_write" on products;
create policy "products_staff_write" on products
  for all
  using (auth_role() in ('admin', 'sales_manager', 'inventory_manager'))
  with check (auth_role() in ('admin', 'sales_manager', 'inventory_manager'));
