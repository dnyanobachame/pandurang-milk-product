-- ============================================================================
-- NEAR-EXPIRY / EXPIRED PACKAGING BATCHES
-- Used by /admin/inventory and the alert center. "Near expiry" = within 2
-- days, matching the perishable nature of milk products (§32).
-- ============================================================================

create or replace view near_expiry_batches
with (security_invoker = true)
as
select
  pb.id, pb.packaging_batch_number, pb.expiry_date, pb.quantity_packed,
  pb.product_id, p.name as product_name,
  (pb.expiry_date - current_date) as days_to_expiry
from packaging_batches pb
join products p on p.id = pb.product_id
where pb.status = 'packed'
  and pb.expiry_date <= current_date + interval '2 days';

-- ============================================================================
-- DAILY SALES — powers /admin/reports without every caller re-deriving a
-- group-by in JS (PostgREST doesn't do arbitrary GROUP BY through the
-- client library).
-- ============================================================================

create or replace view daily_sales
with (security_invoker = true)
as
select
  created_at::date as sale_date,
  count(*) as order_count,
  sum(total) as revenue,
  sum(case when payment_method = 'cod' then total else 0 end) as cod_revenue,
  sum(case when payment_method = 'upi_qr' then total else 0 end) as upi_revenue
from orders
where order_status not in ('cancelled', 'rejected')
group by created_at::date
order by sale_date desc;

create or replace view current_stock
with (security_invoker = true)
as
select
  i.id, i.product_id, p.name as product_name, p.unit,
  i.batch_id, pb.packaging_batch_number, pb.expiry_date,
  i.current_stock, i.updated_at
from inventory i
join products p on p.id = i.product_id
left join packaging_batches pb on pb.id = i.batch_id
where i.current_stock <> 0
order by i.updated_at desc;
