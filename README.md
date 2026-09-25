# Pandurang Milk Product — Platform (Phases 1–4)

Full-stack dairy business management + e-commerce + delivery platform for
**Pandurang Milk Product**, serving Latur District, Maharashtra.

Stack: **Next.js 14 (App Router) + Supabase (Postgres, Auth, Storage) +
Tailwind CSS**, deployed via **GitHub → Vercel → Supabase**.

**Phase 1** (foundation) and **Phase 2** (customer ordering) are done — see
below. Phases 3–5 are scoped in the Roadmap at the bottom.

---

## Phase 1 — Foundation

- **Database schema** (`supabase/01_schema.sql`) — 30+ normalized tables
  covering the full product lifecycle: milk collection → quality → production
  batches → packaging batches → inventory → orders → payments → delivery →
  reports, with batch traceability built into `order_items.batch_id`.
- **Row Level Security** (`supabase/02_rls.sql`) — every table has RLS
  enabled. Customers see only their own data; staff access is scoped by role
  (13 roles, matching the spec's org chart).
- **Seed data** (`supabase/03_seed.sql`) — demo products, delivery areas
  (Latur, Ausa, Nilanga, Udgir, etc.), expense categories. All marked as
  placeholder values for Admin to edit.
- **Auth bootstrap** (`supabase/04_auth_trigger.sql`) — auto-creates a
  `profiles` row (role = `customer`) whenever someone signs up.
- **Next.js app scaffold**:
  - `middleware.ts` — refreshes the Supabase session and enforces
    role-based route access (`lib/roles.ts`) on every request.
  - Public homepage (`app/page.tsx`) reading live products/settings from
    the database.
  - Customer registration with Indian address fields (village/taluka/
    district/PIN) and login.
  - Placeholder dashboards for **Customer**, **Admin**, **Packing staff**,
    and **Delivery partner** — each already wired to real Supabase queries,
    ready to be filled out in the next phases.
  - PWA manifest for "Add to Home Screen" on Android.

---

## Setup

### 1. Create a Supabase project
1. Go to https://supabase.com → New Project.
2. In the SQL Editor, run the files **in order**:
   `01_schema.sql` → `02_rls.sql` → `03_seed.sql` → `04_auth_trigger.sql` →
   `05_functions.sql` → `06_production_functions.sql` → `07_inventory_fix.sql`
   → `08_fixes.sql` → `09_delivery.sql` → `10_reports_views.sql`.
   (If you already ran 01–08 for an earlier version of this project, just
   run `09` and `10` now — `08_fixes.sql` also patches a low-stock query
   bug, an RLS gap that left Quality Control and Packing staff unable to
   read rows they need, and a `production_batches.quantity_sold` field
   that was never being updated.)
3. Copy your Project URL and anon key from **Settings → API**.

### 2. Configure environment variables
```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY
```

### 3. Install and run
```bash
npm install
npm run dev
```

### 4. Create your first Admin user
1. Register a normal account through `/auth/register` (this creates a
   `customer` profile via the auth trigger).
2. In Supabase SQL Editor, promote it:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
3. Log back in — you'll land on `/admin/dashboard`.

Staff accounts (production, packing, delivery partners, etc.) should be
created by Admin from an "Add User" screen (Phase 4) that uses the Supabase
Admin API with the service-role key server-side — never invite staff
through the public `/auth/register` customer flow.

---

## Deployment

```text
GitHub (push this repo)
   → Vercel (import repo, add the same env vars from .env.example
             in Project Settings → Environment Variables)
   → Supabase (already provisioned above)
```

Vercel will auto-deploy on every push to `main`. Set
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as **Production
+ Preview** variables; keep `SUPABASE_SERVICE_ROLE_KEY` and any payment/
WhatsApp secrets **server-only** (never prefixed with `NEXT_PUBLIC_`).

---

## Security notes

- RLS is enabled on every table — there is no "trust the frontend" access
  path. Even if UI code has a bug, the database itself refuses cross-tenant
  reads.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely — it's only used in
  `lib/supabase/server.ts:createServiceRoleClient()`, called exclusively
  from server-only code (Route Handlers / Server Actions), never shipped
  to the client.
- No card numbers, UPI PINs, or banking passwords are ever stored — the
  `payments` table only stores gateway transaction references.
- QR payments are marked `payment_submitted` (not `paid`) until an Admin
  or a gateway webhook verifies them — see `payment_status` enum in the
  schema.

## Phase 2 — Customer ordering (added)

- **Catalog** (`app/(customer)/products`) — category filter, live stock/price
  from the DB, add-to-cart with quantity stepper.
- **Cart** (`lib/cart-context.tsx`, `app/(customer)/cart`) — client-side,
  localStorage-backed so guests can build a cart before signing in.
- **Checkout** (`app/(customer)/checkout`) — address + delivery slot +
  payment method. `app/actions/orders.ts` **re-prices every line item
  server-side from the database** (never trusts cart prices from the
  client), computes delivery fee from the matching `delivery_areas` row,
  and creates the order + items + payment record atomically.
- **QR payment** (`app/(customer)/checkout/payment/[orderId]`) — generates
  a real UPI deep-link QR (`qrcode` package) from Admin's configured UPI ID.
  Clicking "I've Completed Payment" sets `payment_submitted` — **it never
  marks the order paid**; only `adminVerifyPayment` (role-checked
  server-side) in `app/actions/payments.ts` can do that, from the new
  `/admin/orders` screen.
- **Order tracking** (`app/(customer)/dashboard/orders`) — list + detail
  page with a visual status timeline built from `order_status`.
- **Subscriptions** (`app/(customer)/dashboard/subscriptions`) — create,
  pause, resume, cancel. Note: turning an active subscription into a daily
  `orders` row automatically needs a scheduled job (Supabase cron / Edge
  Function) — that's a production-side concern, built in Phase 3 alongside
  the rest of the production pipeline.
- **Two RLS gaps fixed** from Phase 1 while wiring checkout: customers can
  now insert their own `order_items` (previously staff-only), and
  `packing_tasks` are created by a `security definer` DB trigger
  (`supabase/05_functions.sql`) when an order reaches `confirmed`, rather
  than by a client-side insert that RLS would have rejected.
- **`supabase/05_functions.sql`** (new) — human-readable order numbers
  (`MM-260921-0001`), automatic `order_status_events` logging, and the
  packing-task trigger above. Run it after `04_auth_trigger.sql`.

Re-run the SQL files in order on your Supabase project (or just the new
`05_functions.sql` if you already ran 01–04), then `npm install` again to
pick up the `qrcode` dependency.

## Phase 3 — Production, quality control, packing & traceability (added)

- **Milk collection** (`/admin/production/collections`) — log farmer/
  supplier deliveries (fat %, SNF %, temperature, rate → auto-computed
  total). Every new collection starts on **Hold**; nothing downstream can
  use it until Quality Control clears it.
- **Quality Control queue** (`/admin/production/quality`) — a single screen
  listing every milk collection and production batch on Hold, with a
  Pass/Reject form (`recordQualityDecision` in `app/actions/production.ts`)
  that logs a `quality_tests` row and flips the parent record's status.
  Rejected/held batches are structurally blocked from being packaged — the
  UI hides the packaging form, and RLS + a server-side check both refuse
  the action if bypassed.
- **Production batches** (`/admin/production/batches`) — create a batch
  from one or more *quality-passed* milk collections (this link — stored as
  `milk_collection_ids` — is the root of the traceability chain), then
  package quality-approved batches into `packaging_batches`, which credits
  `inventory` and bumps `products.available_quantity` for the storefront.
- **Packing, wired to real state** (`/packing`) — the static checklist from
  Phase 1 is now a real interactive form: checking items persists per-task
  (`app/actions/packing.ts`), "Mark Packed" is disabled until all 8 items
  are checked, and the server re-validates that before allowing it. Marking
  an order packed deducts stock **FEFO** (earliest-expiry packaging batch
  first) and logs an `inventory_movements` row per line item.
- **Batch traceability search** (`/admin/traceability`) — enter a batch
  number and see the full chain: source milk collections → quality tests →
  production batch → packaging batches → customer orders drawing from it,
  each with live status. This is the feature the spec calls out as the most
  important traceability requirement (§75).
- **Subscription → order cron** (`generate_subscription_orders()` in
  `06_production_functions.sql`) — closes the gap noted in Phase 2: turns
  each due subscription into a real order daily, re-pricing from the
  current product price. Schedule it with `pg_cron` (see the comment at the
  bottom of that file) or an external cron hitting a Route Handler.
- **`07_inventory_fix.sql`** — the original `inventory` table design
  assumed one row per (product, batch) that gets incremented over time;
  nothing enforced that. Adds a unique index + an `adjust_inventory()` RPC
  so app code never has to choose between insert and update itself.
- **`08_fixes.sql`** — four bugs found on review, fixed before this went
  out: (1) the admin dashboard's low-stock query compared a column to a
  string literal instead of to `min_stock_level`, so it could never work —
  replaced with a `low_stock_products` view; (2) `production_batches
  .quantity_sold` was displayed on the traceability page but nothing ever
  incremented it — added a trigger that rolls up `sale`/`return`
  `inventory_movements` onto the parent production batch; (3) `quality_control`
  had UPDATE but no SELECT policy on `milk_collections`, so its own Quality
  Control queue would have silently shown nothing; (4) same gap for
  `packing_manager`/`packing_staff` on `production_batches`, which would
  have made "package this batch" fail for those roles even after widening
  their route access to reach the page.

## Phase 4 — Delivery OTP, remaining admin CRUD & reports (added)

- **Delivery OTP flow** (`/delivery`, `app/actions/delivery.ts`) — the full
  partner workflow from the spec (§20–21): Assigned → Accepted → Start
  Delivery → Reached Customer → Delivered, with a "report a problem" path
  at every step. Tapping "Reached Customer" generates a 4-digit OTP,
  stores only its **hash** (`lib/otp.ts`), and delivers the plain code to
  the customer via an in-app notification (the only channel available
  until WhatsApp/SMS ships in Phase 5). Entering the correct code is what
  actually marks the order delivered — and for Cash on Delivery orders,
  **that's also the moment `payment_status` finally becomes `paid`**, not
  at order placement, matching how COD actually works.
- **Admin delivery console** (`/admin/delivery`) — assign packed orders to
  on-duty partners, see everything in progress. **`/admin/delivery/areas`**
  — manage which villages/PINs are served and their delivery fees, the
  same `delivery_areas` table checkout already reads from.
- **Inventory** (`/admin/inventory`) — low-stock and near-expiry alerts,
  a running stock table per product/batch, and a manual adjustment form
  that always requires a reason (§66) and logs an immutable
  `inventory_movements` row.
- **Expenses** (`/admin/expenses`) — log and separately **approve**
  expenses (§53) — entering one doesn't sanction it.
- **Staff & Users** (`/admin/users`) — the intended way to create every
  non-customer account. Admin-only: creates the account via the Supabase
  Admin API (service-role key, server-side only, caller's own admin role
  checked *before* that key is touched), sets the real role, and shows a
  one-time temporary password for the admin to hand off securely.
- **Reports** (`/admin/reports`) — daily sales with COD/UPI split, backed
  by a `daily_sales` SQL view (PostgREST can't do arbitrary `GROUP BY`
  through the client library), plus a working CSV export at
  `/api/reports/sales`.
- **`09_delivery.sql` / `10_reports_views.sql`** (new) — the delivery RLS
  policies (a partner generates/verifies their own OTPs; nobody else can),
  and the `near_expiry_batches` / `daily_sales` / `current_stock` views
  used above.

**Bugs found and fixed while building this phase**, all in `08_fixes.sql`/
inline: (1) an "Export CSV" button in the reports page linked to
`/api/reports/sales`, which didn't exist anywhere — built the actual
Route Handler; (2) the admin dashboard linked to `/admin/packing`, but the
real packing route (from Phase 3) is `/packing` — fixed the link and
removed the stale, unused route-access entry; (3) two new pages
(`/admin/users`, `/admin/delivery/areas`) had no navigation link pointing
to them at all — added them to the dashboard's Quick Links.

## Roadmap (Phase 5)

| Phase | Scope |
|---|---|
| 5 | WhatsApp Business API integration, full PWA (offline, push), SEO, deployment hardening |

Phase 5 is the last one scoped from the original spec. Tell me when you're
ready for it, or ask for anything out of order.
