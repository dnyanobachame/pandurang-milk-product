-- ============================================================================
-- INVENTORY LEDGER FIX
-- 01_schema.sql's `inventory` table computes current_stock from columns on
-- the SAME row (opening + produced + purchased - sold - damaged - expired +
-- returned). That only works if there's exactly one row per (product, batch)
-- that gets incremented over time — not a new row per event. This migration
-- adds that constraint and an upsert RPC so app code never has to choose
-- between "insert" and "update" itself.
-- ============================================================================

-- One running-total row per product+batch (batch nullable for
-- non-batch-tracked products/raw materials).
create unique index if not exists uq_inventory_product_batch
  on inventory (product_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'));

create or replace function adjust_inventory(
  p_product_id uuid,
  p_batch_id uuid,
  p_opening numeric default 0,
  p_produced numeric default 0,
  p_purchased numeric default 0,
  p_sold numeric default 0,
  p_damaged numeric default 0,
  p_returned numeric default 0,
  p_expired numeric default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into inventory (product_id, batch_id, opening_stock, produced, purchased, sold, damaged, returned, expired)
  values (p_product_id, p_batch_id, p_opening, p_produced, p_purchased, p_sold, p_damaged, p_returned, p_expired)
  on conflict (product_id, (coalesce(batch_id, '00000000-0000-0000-0000-000000000000')))
  do update set
    opening_stock = inventory.opening_stock + excluded.opening_stock,
    produced      = inventory.produced + excluded.produced,
    purchased     = inventory.purchased + excluded.purchased,
    sold          = inventory.sold + excluded.sold,
    damaged       = inventory.damaged + excluded.damaged,
    returned      = inventory.returned + excluded.returned,
    expired       = inventory.expired + excluded.expired,
    updated_at    = now();
end;
$$;
