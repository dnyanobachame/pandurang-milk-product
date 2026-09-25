-- ============================================================================
-- PHASE 5 — WhatsApp opt-in + push notification subscriptions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WhatsApp requires explicit opt-in (spec §49). Nothing in 01_schema.sql
-- tracked this, so template/order-update messages had no consent gate to
-- check against.
-- ----------------------------------------------------------------------------

alter table profiles add column if not exists whatsapp_opt_in boolean not null default false;
alter table profiles add column if not exists whatsapp_opt_in_at timestamptz;

alter table company_settings add column if not exists whatsapp_enabled boolean not null default false;

-- ----------------------------------------------------------------------------
-- WEB PUSH SUBSCRIPTIONS — one row per browser/device a user has enabled
-- push on. Storing the raw PushSubscription JSON (endpoint + keys) is the
-- standard Web Push pattern; there's nothing sensitive enough here to
-- warrant a separate encrypted store.
-- ----------------------------------------------------------------------------

create table push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null, -- full PushSubscription.toJSON() output
  user_agent text,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_own" on push_subscriptions
  for all using (user_id = auth.uid());

-- Admin needs to be able to push to any user (order/delivery notifications
-- triggered by staff actions run through the service-role key server-side,
-- which bypasses RLS entirely — no additional policy needed for that path).

-- ----------------------------------------------------------------------------
-- whatsapp_messages already exists (01_schema.sql) but had no RLS policy
-- restricting customers from seeing *other* customers' messages — it was
-- staff-only for all operations (02_rls.sql: "whatsapp_staff_access"),
-- which also means a customer could never see their own WhatsApp history.
-- Add narrow customer read access.
-- ----------------------------------------------------------------------------

create policy "whatsapp_messages_customer_read" on whatsapp_messages
  for select using (customer_id = auth.uid());
