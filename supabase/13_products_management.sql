-- ============================================================================
-- PRODUCT MANAGEMENT — schema additions + Storage bucket/policies
-- Run in the Supabase SQL editor (production database), after 01-12.
--
-- This does NOT touch existing product rows or drop anything — it only
-- adds nullable/defaulted columns to the existing `products` table so
-- current data stays intact.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- New product columns
-- (selling_price, mrp, unit, sku, image_url, description, is_active,
--  delivery_available, available_quantity, min_stock_level already exist
--  in 01_schema.sql and are reused as-is — "stock" and "low stock
--  threshold" in the admin UI map to available_quantity / min_stock_level.)
-- ----------------------------------------------------------------------------
alter table products add column if not exists short_description text;
alter table products add column if not exists slug text;
alter table products add column if not exists discount_type text check (discount_type in ('percentage', 'fixed'));
alter table products add column if not exists discount_value numeric(10,2) not null default 0 check (discount_value >= 0);
alter table products add column if not exists min_order_quantity numeric(10,2) not null default 1 check (min_order_quantity >= 1);
alter table products add column if not exists max_order_quantity numeric(10,2) check (max_order_quantity is null or max_order_quantity >= min_order_quantity);
alter table products add column if not exists is_featured boolean not null default false;
alter table products add column if not exists display_order int not null default 0;
alter table products add column if not exists pickup_available boolean not null default false;

create unique index if not exists idx_products_slug on products(slug) where slug is not null;
create index if not exists idx_products_featured on products(is_featured, display_order);

-- Backfill a slug for any existing rows that don't have one yet, so
-- nothing is left null after this migration (new rows get one from the
-- app going forward).
update products
set slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g')) || '-' || substr(id::text, 1, 6)
where slug is null;

-- ----------------------------------------------------------------------------
-- Storage bucket for product images — public read, staff-only write.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Anyone (including anonymous storefront visitors) can view product
-- images — the bucket is public and product photos aren't sensitive.
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Only staff who are already allowed to manage products (same role set
-- as products_staff_write in 02_rls.sql) may upload.
-- Restricts uploads to the `products/...` path prefix (see
-- lib/product-image-path.ts) so a client can't write arbitrary storage
-- paths even though it's uploading directly with its own session.
drop policy if exists "product_images_staff_insert" on storage.objects;
create policy "product_images_staff_insert" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
    and (storage.foldername(name))[1] = 'products'
  );

drop policy if exists "product_images_staff_update" on storage.objects;
create policy "product_images_staff_update" on storage.objects
  for update using (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
  );

drop policy if exists "product_images_staff_delete" on storage.objects;
create policy "product_images_staff_delete" on storage.objects
  for delete using (
    bucket_id = 'product-images'
    and auth_role() in ('admin', 'sales_manager', 'inventory_manager')
  );

-- ----------------------------------------------------------------------------
-- Audit log inserts for product changes go through the service-role
-- client server-side (see app/actions/products.ts) — consistent with the
-- existing note in 02_rls.sql that audit_logs inserts bypass RLS by
-- design and are never granted to regular authenticated roles. No RLS
-- change needed here.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- NOTE on products table RLS: no change needed. The existing policies
-- already do exactly what's required:
--   products_public_read: select using (is_active = true or is_staff())
--   products_staff_write: for all using (auth_role() in
--     ('admin','sales_manager','inventory_manager'))
-- Customers already have zero INSERT/UPDATE/DELETE grant on products.
-- ----------------------------------------------------------------------------
