-- ============================================================================
-- STOCK HELPER — atomic increment/decrement so concurrent packaging/orders
-- don't race each other on products.available_quantity.
-- ============================================================================

create or replace function increment_product_stock(p_product_id uuid, p_quantity numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
  set available_quantity = available_quantity + p_quantity
  where id = p_product_id;
end;
$$;

create or replace function decrement_product_stock(p_product_id uuid, p_quantity numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update products
  set available_quantity = greatest(0, available_quantity - p_quantity)
  where id = p_product_id;
end;
$$;

-- ============================================================================
-- SUBSCRIPTION -> ORDER GENERATOR
-- Run daily (see scheduling note below) to turn each active, unpaused
-- subscription due "today" into a real order, the same way a one-off
-- checkout would — re-pricing from the current product price, computing
-- delivery fee from the matching delivery_areas row, and creating a
-- subscription_deliveries row linking the subscription to the new order.
-- ============================================================================

create or replace function generate_subscription_orders()
returns table(created_order_id uuid, subscription_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  sub record;
  new_order_id uuid;
  product_price numeric;
  product_gst numeric;
  area_fee numeric;
  area_free_above numeric;
  village text;
  line_total numeric;
  line_tax numeric;
  delivery_fee numeric;
begin
  for sub in
    select s.*
    from subscriptions s
    where s.is_active = true
      and s.is_paused = false
      and s.start_date <= current_date
      and (s.end_date is null or s.end_date >= current_date)
      -- Skip if a delivery for today was already generated (idempotent re-runs)
      and not exists (
        select 1 from subscription_deliveries sd
        where sd.subscription_id = s.id and sd.delivery_date = current_date
      )
      and (
        s.frequency = 'daily'
        or (s.frequency = 'alternate_days' and mod((current_date - s.start_date), 2) = 0)
        or (s.frequency = 'weekly' and extract(dow from current_date) = extract(dow from s.start_date))
      )
  loop
    select selling_price, gst_percent into product_price, product_gst
    from products where id = sub.product_id;

    if product_price is null then
      continue; -- product deleted/deactivated — skip, don't crash the whole run
    end if;

    select village_city into village
    from customer_addresses where id = sub.delivery_address_id;

    select delivery_fee, free_delivery_above into area_fee, area_free_above
    from delivery_areas where city_or_village ilike coalesce(village, '') limit 1;

    line_total := product_price * sub.quantity;
    line_tax := line_total * coalesce(product_gst, 0) / 100;
    delivery_fee := case
      when area_free_above is not null and line_total >= area_free_above then 0
      else coalesce(area_fee, 0)
    end;

    insert into orders (
      customer_id, delivery_address_id, subtotal, tax, delivery_fee, total,
      payment_method, payment_status, order_status, delivery_date
    ) values (
      sub.customer_id, sub.delivery_address_id, line_total, line_tax, delivery_fee,
      line_total + line_tax + delivery_fee,
      sub.payment_method,
      case when sub.payment_method = 'cod' then 'pending' else 'payment_initiated' end,
      case when sub.payment_method = 'cod' then 'confirmed' else 'payment_pending' end,
      current_date
    )
    returning id into new_order_id;

    insert into order_items (order_id, product_id, quantity, unit_price, tax, total)
    values (new_order_id, sub.product_id, sub.quantity, product_price, line_tax, line_total + line_tax);

    insert into payments (order_id, customer_id, amount, payment_method, status)
    values (
      new_order_id, sub.customer_id, line_total + line_tax + delivery_fee, sub.payment_method,
      case when sub.payment_method = 'cod' then 'pending' else 'payment_initiated' end
    );

    insert into subscription_deliveries (subscription_id, delivery_date, order_id, status)
    values (sub.id, current_date, new_order_id, 'order_created');

    created_order_id := new_order_id;
    subscription_id := sub.id;
    return next;
  end loop;
end;
$$;

-- ============================================================================
-- SCHEDULING (do this in the Supabase dashboard, not via this file):
--
-- 1. Database -> Extensions -> enable "pg_cron" (and "pg_net" if you later
--    want the job to call an HTTP endpoint instead).
-- 2. SQL Editor:
--      select cron.schedule(
--        'generate-subscription-orders',
--        '0 5 * * *',                          -- 5:00 AM daily, server time
--        $$select generate_subscription_orders();$$
--      );
-- 3. To inspect/remove later:
--      select * from cron.job;
--      select cron.unschedule('generate-subscription-orders');
--
-- If your Supabase plan doesn't support pg_cron, call
-- generate_subscription_orders() from a Vercel Cron Job / GitHub Action
-- hitting a small Route Handler instead (Phase 4/5 concern).
-- ============================================================================
