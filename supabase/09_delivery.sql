-- ============================================================================
-- DELIVERY OTP — partner-side access
-- 02_rls.sql's "otp_system_write" policy only grants admin/delivery_manager
-- "for all" on delivery_otp. But the OTP is generated the moment the
-- delivery partner themselves taps "Reached Customer" (reachCustomer() in
-- app/actions/delivery.ts), and verified when they enter the customer's
-- code (confirmDelivery()) — both partner-initiated, not admin-initiated.
-- Add narrow policies for exactly those two operations, scoped to orders
-- the partner is actually assigned to.
-- ============================================================================

create policy "otp_partner_insert" on delivery_otp
  for insert with check (
    exists (
      select 1 from orders o
      where o.id = order_id and o.delivery_partner_id = auth.uid()
    )
  );

create policy "otp_partner_verify" on delivery_otp
  for update using (
    exists (
      select 1 from orders o
      where o.id = order_id and o.delivery_partner_id = auth.uid()
    )
  );

-- ============================================================================
-- delivery_partners — a partner needs to see their own row to show on-duty
-- toggle state; "delivery_partners_self_or_staff" already covers select.
-- Missing: nothing to add here, listed for completeness while auditing
-- the delivery flow's RLS surface.
-- ============================================================================

-- ============================================================================
-- REPORTS — sales_manager/accountant need to read delivery_assignments to
-- build delivery/partner reports. (orders/order_items are already readable
-- by accountant via 02_rls.sql's "orders_staff_read" and the is_staff()
-- check in "order_items_visible" — no gap there.)
-- ============================================================================

create policy "delivery_assignments_reports_read" on delivery_assignments
  for select using (auth_role() in ('accountant', 'sales_manager'));
