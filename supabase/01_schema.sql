-- ============================================================================
-- PANDURANG MILK PRODUCT — CORE DATABASE SCHEMA
-- Target: Supabase (PostgreSQL 15+)
-- Phase 1: Foundation schema. Run in order: 01_schema.sql -> 02_rls.sql -> 03_seed.sql
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

create type app_role as enum (
  'admin',
  'production_manager',
  'production_staff',
  'quality_control',
  'packing_manager',
  'packing_staff',
  'inventory_manager',
  'sales_manager',
  'accountant',
  'customer_support',
  'delivery_manager',
  'delivery_partner',
  'customer'
);

create type order_status as enum (
  'placed', 'payment_pending', 'payment_confirmed', 'confirmed',
  'packing', 'packed', 'assigned', 'out_for_delivery', 'delivered',
  'cancelled', 'rejected', 'refund_requested', 'refunded', 'delivery_failed'
);

create type payment_status as enum (
  'pending', 'payment_initiated', 'payment_submitted', 'paid',
  'failed', 'refunded', 'partially_refunded'
);

create type payment_method as enum ('upi_qr', 'cod', 'gateway');

create type quality_status as enum ('passed', 'rejected', 'hold');

create type packing_status as enum ('waiting', 'pending_packing', 'packing', 'packed', 'quality_hold', 'rejected');

create type delivery_status as enum (
  'unassigned', 'assigned', 'accepted', 'picked_up',
  'out_for_delivery', 'reached_customer', 'delivered', 'failed'
);

create type refund_status as enum ('requested', 'approved', 'processing', 'completed', 'rejected');

create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type whatsapp_status as enum ('queued', 'sent', 'delivered', 'read', 'failed');

create type movement_type as enum ('production', 'purchase', 'sale', 'return', 'damage', 'expiry', 'adjustment');

-- ============================================================================
-- COMPANY / SETTINGS
-- ============================================================================

create table company_settings (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null default 'Pandurang Milk Product',
  tagline text default 'Fresh. Pure. Trusted.',
  phone text,
  email text,
  address text,
  upi_id text,
  upi_qr_image_url text,
  qr_payment_enabled boolean not null default true,
  cod_enabled boolean not null default true,
  free_delivery_above numeric(10,2),
  default_delivery_fee numeric(10,2) default 0,
  gst_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- USERS / ROLES
-- profiles extends auth.users (Supabase managed)
-- ============================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text unique,
  email text,
  role app_role not null default 'customer',
  is_active boolean not null default true,
  avatar_url text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

create index idx_profiles_role on profiles(role);

-- ============================================================================
-- CUSTOMER ADDRESSES
-- ============================================================================

create table customer_addresses (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id) on delete cascade,
  label text default 'Home',
  address_line text not null,
  village_city text not null,
  taluka text,
  district text not null default 'Latur',
  pin_code text not null,
  landmark text,
  latitude double precision,
  longitude double precision,
  delivery_instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- DELIVERY AREAS
-- ============================================================================

create table delivery_areas (
  id uuid primary key default uuid_generate_v4(),
  district text not null default 'Latur',
  city_or_village text not null,
  pin_code text,
  is_active boolean not null default true,
  delivery_fee numeric(10,2) default 0,
  free_delivery_above numeric(10,2),
  min_order_amount numeric(10,2) default 0,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SUPPLIERS / FARMERS
-- ============================================================================

create table suppliers (
  id uuid primary key default uuid_generate_v4(),
  supplier_code text unique not null,
  name text not null,
  mobile text,
  address text,
  village text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc text,
  is_active boolean not null default true,
  outstanding_balance numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ============================================================================
-- MILK COLLECTION
-- ============================================================================

create table milk_collections (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id),
  collection_date date not null default current_date,
  collection_time time not null default current_time,
  milk_type text not null, -- cow / buffalo
  quantity_litres numeric(10,2) not null,
  fat_percent numeric(5,2),
  snf_percent numeric(5,2),
  temperature numeric(5,2),
  quality_status quality_status not null default 'hold',
  rate_per_litre numeric(10,2) not null,
  total_amount numeric(12,2) generated always as (quantity_litres * rate_per_litre) stored,
  collection_center text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- QUALITY TESTS (general — collections + production batches)
-- ============================================================================

create table quality_tests (
  id uuid primary key default uuid_generate_v4(),
  reference_type text not null check (reference_type in ('milk_collection', 'production_batch', 'packaging_batch')),
  reference_id uuid not null,
  fat_percent numeric(5,2),
  snf_percent numeric(5,2),
  temperature numeric(5,2),
  acidity numeric(5,2),
  status quality_status not null default 'hold',
  inspector_id uuid references profiles(id),
  notes text,
  tested_at timestamptz not null default now()
);

-- ============================================================================
-- PRODUCT CATALOG
-- ============================================================================

create table product_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_marathi text,
  is_active boolean not null default true,
  sort_order int default 0
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  name_marathi text,
  category_id uuid references product_categories(id),
  sku text unique not null,
  product_code text unique not null,
  description text,
  image_url text,
  unit text not null, -- ml, litre, g, kg, pcs
  net_quantity numeric(10,2),
  selling_price numeric(10,2) not null,
  production_cost numeric(10,2),
  mrp numeric(10,2),
  gst_percent numeric(5,2) default 0,
  available_quantity numeric(12,2) not null default 0,
  min_stock_level numeric(12,2) not null default 0,
  shelf_life_days int,
  is_batch_tracked boolean not null default true,
  is_active boolean not null default true,
  delivery_available boolean not null default true,
  storage_requirements text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- ============================================================================
-- PRODUCTION BATCHES / TRACEABILITY CHAIN
-- ============================================================================

create table production_batches (
  id uuid primary key default uuid_generate_v4(),
  batch_number text unique not null,
  product_id uuid not null references products(id),
  milk_collection_ids uuid[] default '{}', -- source milk collections (traceability)
  production_date date not null default current_date,
  production_time time not null default current_time,
  expiry_date date not null,
  quantity_produced numeric(12,2) not null,
  quantity_packed numeric(12,2) not null default 0,
  quantity_sold numeric(12,2) not null default 0,
  quantity_remaining numeric(12,2) generated always as (quantity_produced - quantity_sold) stored,
  production_staff_id uuid references profiles(id),
  quality_status quality_status not null default 'hold',
  notes text,
  created_at timestamptz not null default now()
);

create table packaging_batches (
  id uuid primary key default uuid_generate_v4(),
  packaging_batch_number text unique not null,
  production_batch_id uuid not null references production_batches(id),
  product_id uuid not null references products(id),
  packaging_date date not null default current_date,
  quantity_packed numeric(12,2) not null,
  package_size text,
  packaging_staff_id uuid references profiles(id),
  expiry_date date not null,
  status packing_status not null default 'waiting',
  packed_by uuid references profiles(id),
  packed_at timestamptz,
  package_number text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INVENTORY
-- ============================================================================

create table inventory (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id),
  batch_id uuid references packaging_batches(id),
  opening_stock numeric(12,2) not null default 0,
  produced numeric(12,2) not null default 0,
  purchased numeric(12,2) not null default 0,
  sold numeric(12,2) not null default 0,
  damaged numeric(12,2) not null default 0,
  returned numeric(12,2) not null default 0,
  expired numeric(12,2) not null default 0,
  current_stock numeric(12,2) generated always as
    (opening_stock + produced + purchased - sold - damaged - expired + returned) stored,
  updated_at timestamptz not null default now()
);

create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id),
  batch_id uuid references packaging_batches(id),
  movement_type movement_type not null,
  quantity numeric(12,2) not null,
  reason text,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CUSTOMERS / ORDERS
-- ============================================================================

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  customer_id uuid not null references profiles(id),
  delivery_address_id uuid references customer_addresses(id),
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status payment_status not null default 'pending',
  order_status order_status not null default 'placed',
  delivery_status delivery_status not null default 'unassigned',
  payment_method payment_method not null default 'upi_qr',
  delivery_partner_id uuid references profiles(id),
  delivery_date date,
  delivery_slot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  batch_id uuid references packaging_batches(id),
  quantity numeric(10,2) not null,
  unit_price numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(12,2) not null
);

create table order_status_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PAYMENTS
-- ============================================================================

create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  customer_id uuid not null references profiles(id),
  amount numeric(12,2) not null,
  payment_method payment_method not null,
  status payment_status not null default 'pending',
  gateway text,
  transaction_id text,
  provider_reference text,
  verified_by uuid references profiles(id), -- admin who manually verified UPI QR payment
  verified_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references profiles(id),
  product_id uuid not null references products(id),
  quantity numeric(10,2) not null,
  frequency text not null, -- daily, alternate_days, weekly, custom
  delivery_address_id uuid references customer_addresses(id),
  payment_method payment_method not null default 'cod',
  start_date date not null default current_date,
  end_date date,
  is_active boolean not null default true,
  is_paused boolean not null default false,
  created_at timestamptz not null default now()
);

create table subscription_deliveries (
  id uuid primary key default uuid_generate_v4(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  delivery_date date not null,
  order_id uuid references orders(id),
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- DELIVERY
-- ============================================================================

create table delivery_partners (
  id uuid primary key references profiles(id),
  vehicle_number text,
  is_on_duty boolean not null default false,
  current_latitude double precision,
  current_longitude double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table delivery_assignments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  delivery_partner_id uuid not null references profiles(id),
  status delivery_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  failed_reason text,
  cash_collected numeric(10,2),
  created_at timestamptz not null default now()
);

create table delivery_otp (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  otp_hash text not null,
  is_verified boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table delivery_events (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  delivery_partner_id uuid references profiles(id),
  event_type text not null,
  latitude double precision,
  longitude double precision,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PACKING TASKS
-- ============================================================================

create table packing_tasks (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  status packing_status not null default 'pending_packing',
  checklist jsonb not null default '{}'::jsonb,
  packed_by uuid references profiles(id),
  packed_at timestamptz,
  package_number text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PURCHASES / EXPENSES
-- ============================================================================

create table purchase_orders (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id),
  order_date date not null default current_date,
  invoice_number text,
  payment_status payment_status not null default 'pending',
  total_amount numeric(12,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table purchase_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  product_or_material text not null,
  quantity numeric(12,2) not null,
  unit_price numeric(10,2) not null,
  total numeric(12,2) not null,
  received_quantity numeric(12,2) default 0,
  rejected_quantity numeric(12,2) default 0
);

create table expense_categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null
);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references expense_categories(id),
  name text not null,
  amount numeric(12,2) not null,
  expense_date date not null default current_date,
  vendor text,
  payment_method text,
  receipt_url text,
  notes text,
  created_by uuid references profiles(id),
  approved_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICATIONS / WHATSAPP
-- ============================================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references profiles(id),
  title text not null,
  body text not null,
  type text, -- order, payment, stock, production, delivery, support
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references profiles(id),
  template_name text,
  body text,
  status whatsapp_status not null default 'queued',
  reference_order_id uuid references orders(id),
  provider_message_id text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SUPPORT / REFUNDS
-- ============================================================================

create table support_tickets (
  id uuid primary key default uuid_generate_v4(),
  ticket_number text unique not null,
  customer_id uuid not null references profiles(id),
  order_id uuid references orders(id),
  category text not null,
  description text not null,
  image_urls text[] default '{}',
  status ticket_status not null default 'open',
  assigned_to uuid references profiles(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table refunds (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  amount numeric(12,2) not null,
  reason text,
  status refund_status not null default 'requested',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INVOICES / AUDIT
-- ============================================================================

create table invoices (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id),
  invoice_number text unique not null,
  pdf_url text,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id uuid not null,
  action text not null, -- insert, update, delete
  performed_by uuid references profiles(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- INDEXES (key lookups)
-- ============================================================================

create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(order_status);
create index idx_orders_created on orders(created_at desc);
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_batch on order_items(batch_id);
create index idx_payments_order on payments(order_id);
create index idx_production_batches_number on production_batches(batch_number);
create index idx_packaging_batches_number on packaging_batches(packaging_batch_number);
create index idx_inventory_product on inventory(product_id);
create index idx_delivery_assignments_order on delivery_assignments(order_id);
create index idx_delivery_assignments_partner on delivery_assignments(delivery_partner_id);
create index idx_notifications_recipient on notifications(recipient_id, is_read);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create trigger trg_orders_updated before update on orders
  for each row execute function set_updated_at();
create trigger trg_company_settings_updated before update on company_settings
  for each row execute function set_updated_at();
create trigger trg_support_tickets_updated before update on support_tickets
  for each row execute function set_updated_at();
