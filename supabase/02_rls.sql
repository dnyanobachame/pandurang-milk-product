-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Run after 01_schema.sql
-- Model: every table has RLS enabled. Access is granted via profiles.role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid recursive RLS lookups)
-- ----------------------------------------------------------------------------

create or replace function auth_role()
returns app_role
language sql
security definer
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_staff()
returns boolean
language sql
security definer
stable
as $$
  select auth_role() not in ('customer');
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select auth_role() = 'admin';
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table profiles enable row level security;

create policy "profiles_select_own_or_staff" on profiles
  for select using (id = auth.uid() or is_staff());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_admin_manage" on profiles
  for all using (is_admin());

-- ============================================================================
-- COMPANY SETTINGS — public read (for website), admin write
-- ============================================================================
alter table company_settings enable row level security;

create policy "company_settings_public_read" on company_settings
  for select using (true);

create policy "company_settings_admin_write" on company_settings
  for all using (is_admin());

-- ============================================================================
-- PRODUCTS / CATEGORIES — public read (active only for anon), staff manage
-- ============================================================================
alter table products enable row level security;
alter table product_categories enable row level security;

create policy "products_public_read" on products
  for select using (is_active = true or is_staff());

create policy "products_staff_write" on products
  for all using (auth_role() in ('admin', 'sales_manager', 'inventory_manager'));

create policy "categories_public_read" on product_categories
  for select using (true);

create policy "categories_admin_write" on product_categories
  for all using (is_admin());

-- ============================================================================
-- DELIVERY AREAS — public read, admin write
-- ============================================================================
alter table delivery_areas enable row level security;

create policy "delivery_areas_public_read" on delivery_areas
  for select using (true);

create policy "delivery_areas_admin_write" on delivery_areas
  for all using (auth_role() in ('admin', 'delivery_manager'));

-- ============================================================================
-- CUSTOMER ADDRESSES — customer sees/manages own, staff can view
-- ============================================================================
alter table customer_addresses enable row level security;

create policy "addresses_own_or_staff" on customer_addresses
  for select using (customer_id = auth.uid() or is_staff());

create policy "addresses_own_write" on customer_addresses
  for insert with check (customer_id = auth.uid());

create policy "addresses_own_update" on customer_addresses
  for update using (customer_id = auth.uid());

create policy "addresses_own_delete" on customer_addresses
  for delete using (customer_id = auth.uid());

-- ============================================================================
-- ORDERS — customer sees own; staff by role
-- ============================================================================
alter table orders enable row level security;

create policy "orders_customer_own" on orders
  for select using (customer_id = auth.uid());

create policy "orders_customer_create" on orders
  for insert with check (customer_id = auth.uid());

create policy "orders_staff_read" on orders
  for select using (auth_role() in
    ('admin','sales_manager','packing_manager','packing_staff',
     'delivery_manager','delivery_partner','customer_support','accountant'));

create policy "orders_delivery_partner_assigned" on orders
  for select using (delivery_partner_id = auth.uid());

create policy "orders_staff_update" on orders
  for update using (auth_role() in
    ('admin','sales_manager','packing_manager','packing_staff','delivery_manager'));

-- ============================================================================
-- ORDER ITEMS — follow parent order visibility
-- ============================================================================
alter table order_items enable row level security;

create policy "order_items_visible" on order_items
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (o.customer_id = auth.uid() or o.delivery_partner_id = auth.uid() or is_staff()))
  );

create policy "order_items_staff_write" on order_items
  for all using (auth_role() in ('admin','sales_manager'));

-- Packing staff assign batch_id (FEFO) when marking an order packed.
create policy "order_items_packing_update" on order_items
  for update using (auth_role() in ('packing_manager','packing_staff'));

-- Customers insert their own order's line items during checkout (the order
-- row itself is already scoped to auth.uid() by orders_customer_create).
create policy "order_items_customer_create" on order_items
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

-- ============================================================================
-- ORDER STATUS EVENTS
-- ============================================================================
alter table order_status_events enable row level security;

create policy "order_events_visible" on order_status_events
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (o.customer_id = auth.uid() or is_staff()))
  );

create policy "order_events_staff_write" on order_status_events
  for insert with check (is_staff());

-- ============================================================================
-- PAYMENTS — customer sees own; admin/accountant verify
-- ============================================================================
alter table payments enable row level security;

create policy "payments_customer_own" on payments
  for select using (customer_id = auth.uid());

create policy "payments_customer_create" on payments
  for insert with check (customer_id = auth.uid());

create policy "payments_staff_manage" on payments
  for all using (auth_role() in ('admin','accountant','sales_manager'));

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
alter table subscriptions enable row level security;
alter table subscription_deliveries enable row level security;

create policy "subscriptions_own" on subscriptions
  for select using (customer_id = auth.uid() or is_staff());

create policy "subscriptions_own_write" on subscriptions
  for insert with check (customer_id = auth.uid());

create policy "subscriptions_own_update" on subscriptions
  for update using (customer_id = auth.uid() or auth_role() in ('admin','sales_manager'));

create policy "subscription_deliveries_visible" on subscription_deliveries
  for select using (
    exists (select 1 from subscriptions s where s.id = subscription_id
            and (s.customer_id = auth.uid() or is_staff()))
  );

-- ============================================================================
-- DELIVERY PARTNERS / ASSIGNMENTS / OTP / EVENTS
-- ============================================================================
alter table delivery_partners enable row level security;
alter table delivery_assignments enable row level security;
alter table delivery_otp enable row level security;
alter table delivery_events enable row level security;

create policy "delivery_partners_self_or_staff" on delivery_partners
  for select using (id = auth.uid() or auth_role() in ('admin','delivery_manager'));

create policy "delivery_partners_self_update" on delivery_partners
  for update using (id = auth.uid());

create policy "delivery_partners_admin_write" on delivery_partners
  for insert with check (auth_role() in ('admin','delivery_manager'));

create policy "assignments_partner_or_staff" on delivery_assignments
  for select using (delivery_partner_id = auth.uid() or auth_role() in ('admin','delivery_manager'));

create policy "assignments_staff_write" on delivery_assignments
  for insert with check (auth_role() in ('admin','delivery_manager'));

create policy "assignments_partner_update" on delivery_assignments
  for update using (delivery_partner_id = auth.uid() or auth_role() in ('admin','delivery_manager'));

create policy "otp_partner_or_staff" on delivery_otp
  for select using (
    exists (select 1 from orders o where o.id = order_id and
      (o.delivery_partner_id = auth.uid() or auth_role() in ('admin','delivery_manager')))
  );

create policy "otp_system_write" on delivery_otp
  for all using (auth_role() in ('admin','delivery_manager'));

create policy "delivery_events_partner_or_staff" on delivery_events
  for select using (delivery_partner_id = auth.uid() or auth_role() in ('admin','delivery_manager'));

create policy "delivery_events_partner_write" on delivery_events
  for insert with check (delivery_partner_id = auth.uid() or auth_role() in ('admin','delivery_manager'));

-- ============================================================================
-- PACKING TASKS
-- ============================================================================
alter table packing_tasks enable row level security;

create policy "packing_staff_access" on packing_tasks
  for all using (auth_role() in ('admin','packing_manager','packing_staff'));

-- packing_tasks rows are created automatically by a trigger
-- (create_packing_task_on_order_confirm, see 05_functions.sql) running as
-- the trigger owner, not inserted directly by the customer — so no
-- customer insert policy is needed here.

-- ============================================================================
-- PRODUCTION / QUALITY / SUPPLIERS / BATCHES
-- ============================================================================
alter table suppliers enable row level security;
alter table milk_collections enable row level security;
alter table quality_tests enable row level security;
alter table production_batches enable row level security;
alter table packaging_batches enable row level security;

create policy "suppliers_staff_access" on suppliers
  for all using (auth_role() in ('admin','production_manager','accountant'));

create policy "milk_collections_staff_access" on milk_collections
  for all using (auth_role() in ('admin','production_manager','production_staff'));

-- Quality Control clears/rejects collections (updates quality_status only,
-- via recordQualityDecision — see app/actions/production.ts).
create policy "milk_collections_quality_update" on milk_collections
  for update using (auth_role() in ('quality_control'));

create policy "quality_tests_staff_access" on quality_tests
  for all using (auth_role() in ('admin','production_manager','quality_control'));

create policy "production_batches_staff_access" on production_batches
  for all using (auth_role() in ('admin','production_manager','production_staff','quality_control'));

-- Packing staff package approved batches, which bumps quantity_packed on
-- the parent production_batches row (see packageProductionBatch action).
create policy "production_batches_packing_update" on production_batches
  for update using (auth_role() in ('packing_manager','packing_staff'));

create policy "packaging_batches_staff_access" on packaging_batches
  for all using (auth_role() in ('admin','production_manager','packing_manager','packing_staff'));

-- Batch traceability read access for sales/support to trace an order back
create policy "batches_read_extended" on production_batches
  for select using (auth_role() in ('admin','sales_manager','customer_support','inventory_manager'));

create policy "packaging_batches_read_extended" on packaging_batches
  for select using (auth_role() in ('admin','sales_manager','customer_support','inventory_manager'));

-- ============================================================================
-- INVENTORY
-- ============================================================================
alter table inventory enable row level security;
alter table inventory_movements enable row level security;

create policy "inventory_staff_access" on inventory
  for all using (auth_role() in ('admin','inventory_manager','sales_manager'));

create policy "inventory_movements_staff_access" on inventory_movements
  for all using (auth_role() in (
    'admin','inventory_manager','production_manager','production_staff',
    'packing_manager','packing_staff'
  ));

-- ============================================================================
-- PURCHASES / EXPENSES
-- ============================================================================
alter table purchase_orders enable row level security;
alter table purchase_items enable row level security;
alter table expense_categories enable row level security;
alter table expenses enable row level security;

create policy "purchases_finance_access" on purchase_orders
  for all using (auth_role() in ('admin','accountant','inventory_manager'));

create policy "purchase_items_finance_access" on purchase_items
  for all using (
    exists (select 1 from purchase_orders p where p.id = purchase_order_id and
      auth_role() in ('admin','accountant','inventory_manager'))
  );

create policy "expense_categories_finance_access" on expense_categories
  for all using (auth_role() in ('admin','accountant'));

create policy "expenses_finance_access" on expenses
  for all using (auth_role() in ('admin','accountant'));

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
alter table notifications enable row level security;

create policy "notifications_own" on notifications
  for select using (recipient_id = auth.uid());

create policy "notifications_own_update" on notifications
  for update using (recipient_id = auth.uid());

create policy "notifications_system_write" on notifications
  for insert with check (is_staff());

-- ============================================================================
-- WHATSAPP MESSAGES — staff/admin only
-- ============================================================================
alter table whatsapp_messages enable row level security;

create policy "whatsapp_staff_access" on whatsapp_messages
  for all using (auth_role() in ('admin','sales_manager','customer_support'));

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================
alter table support_tickets enable row level security;

create policy "tickets_customer_own" on support_tickets
  for select using (customer_id = auth.uid() or auth_role() in ('admin','customer_support'));

create policy "tickets_customer_create" on support_tickets
  for insert with check (customer_id = auth.uid());

create policy "tickets_staff_update" on support_tickets
  for update using (auth_role() in ('admin','customer_support'));

-- ============================================================================
-- REFUNDS
-- ============================================================================
alter table refunds enable row level security;

create policy "refunds_visible" on refunds
  for select using (
    exists (select 1 from orders o where o.id = order_id and
      (o.customer_id = auth.uid() or auth_role() in ('admin','accountant','customer_support')))
  );

create policy "refunds_customer_create" on refunds
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "refunds_staff_manage" on refunds
  for update using (auth_role() in ('admin','accountant'));

-- ============================================================================
-- INVOICES
-- ============================================================================
alter table invoices enable row level security;

create policy "invoices_visible" on invoices
  for select using (
    exists (select 1 from orders o where o.id = order_id and
      (o.customer_id = auth.uid() or is_staff()))
  );

create policy "invoices_staff_write" on invoices
  for insert with check (is_staff());

-- ============================================================================
-- AUDIT LOGS — admin read only, system write (service role bypasses RLS)
-- ============================================================================
alter table audit_logs enable row level security;

create policy "audit_logs_admin_read" on audit_logs
  for select using (is_admin());

-- Note: audit log inserts are performed by triggers/server using the
-- service_role key, which bypasses RLS by design. No insert policy is
-- granted to regular authenticated roles.
