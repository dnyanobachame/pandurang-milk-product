-- ============================================================================
-- PHASE 3 FIXES — bugs found on review, before this goes to production.
-- Run after 07_inventory_fix.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX 1: LOW STOCK VIEW
-- The admin dashboard needs "available_quantity < min_stock_level" — a
-- comparison between two columns on the same row. PostgREST's .lt(col, val)
-- treats the second argument as a literal, not a column reference, so that
-- comparison can't be expressed as a supabase-js filter directly. A view
-- does the comparison once in SQL and the app just selects from it.
-- ----------------------------------------------------------------------------

create or replace view low_stock_products
with (security_invoker = true)
as
select id, name, name_marathi, sku, unit, available_quantity, min_stock_level, category_id
from products
where is_active = true
  and available_quantity < min_stock_level;

-- ----------------------------------------------------------------------------
-- FIX 2: KEEP production_batches.quantity_sold IN SYNC
-- markTaskPacked() (app/actions/packing.ts) logs a 'sale' inventory_movement
-- against a packaging_batches.id, but nothing rolled that up to the
-- *production* batch it came from — so quantity_sold (shown on
-- /admin/traceability) stayed at 0 forever. This trigger closes that loop
-- generically for any 'sale' or 'return' movement.
-- ----------------------------------------------------------------------------

create or replace function sync_production_batch_sold()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_production_batch_id uuid;
begin
  if new.movement_type not in ('sale', 'return') or new.batch_id is null then
    return new;
  end if;

  select production_batch_id into v_production_batch_id
  from packaging_batches where id = new.batch_id;

  if v_production_batch_id is null then
    return new;
  end if;

  update production_batches
  set quantity_sold = quantity_sold +
    case when new.movement_type = 'sale' then new.quantity else -new.quantity end
  where id = v_production_batch_id;

  return new;
end;
$$;

create trigger trg_sync_production_batch_sold
  after insert on inventory_movements
  for each row execute function sync_production_batch_sold();

-- ----------------------------------------------------------------------------
-- FIX 3: quality_control COULD UPDATE BUT NOT SELECT milk_collections
-- 02_rls.sql's "milk_collections_quality_update" policy only covers UPDATE.
-- Without a matching SELECT policy, RLS silently returns zero rows for
-- quality_control users — the /admin/production/quality queue would always
-- look empty for that role even though admin/production_manager see it fine.
-- ----------------------------------------------------------------------------

create policy "milk_collections_quality_select" on milk_collections
  for select using (auth_role() = 'quality_control');

-- ----------------------------------------------------------------------------
-- FIX 4: packing_manager/packing_staff CAN UPDATE BUT NOT SELECT
-- production_batches. packageProductionBatch() (app/actions/production.ts)
-- reads quality_status/quantity_produced/quantity_packed before packaging —
-- without a SELECT policy that read returns null under RLS, so packing
-- staff could never actually package a batch, even from the now-reachable
-- /admin/production/batches page (see lib/roles.ts).
-- ----------------------------------------------------------------------------

create policy "production_batches_packing_select" on production_batches
  for select using (auth_role() in ('packing_manager', 'packing_staff'));
