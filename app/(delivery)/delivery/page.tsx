import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

import { DeliveryAssignmentCard } from '@/components/delivery/DeliveryAssignmentCard';

export const dynamic = 'force-dynamic';

type DeliveryAssignment = {
  id: string;
  status: string;
  order_id: string;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  cash_collected: number | null;
  orders:
    | {
        order_number: string;
        total: number;
        delivery_fee: number | null;
        payment_method: string;
        payment_status: string;
        customer_addresses:
          | {
              village_city: string | null;
              address_line: string | null;
            }
          | {
              village_city: string | null;
              address_line: string | null;
            }[]
          | null;
      }
    | {
        order_number: string;
        total: number;
        delivery_fee: number | null;
        payment_method: string;
        payment_status: string;
        customer_addresses:
          | {
              village_city: string | null;
              address_line: string | null;
            }
          | {
              village_city: string | null;
              address_line: string | null;
            }[]
          | null;
      }[]
    | null;
};

const ACTIVE_STATUSES = [
  'assigned',
  'accepted',
  'picked_up',
  'out_for_delivery',
  'reached_customer',
];

const HISTORY_STATUSES = [
  'delivered',
  'failed',
];

export default async function DeliveryDashboard() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  /*
   * Use the application-local calendar date for dashboard grouping.
   *
   * The application is intended for India, so use Asia/Kolkata
   * rather than relying on the server's UTC date.
   */
  const now = new Date();

  const indiaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const todayStart = `${indiaDate}T00:00:00+05:30`;

  /*
   * Load:
   *
   * 1. Partner profile
   * 2. Active assignments
   * 3. Recent delivery history
   *
   * We intentionally keep completed/failed deliveries separate from
   * the active work queue so the partner can see both current work
   * and completed performance.
   */
  const [
    { data: profile, error: profileError },
    { data: activeAssignments, error: activeAssignmentsError },
    { data: historyAssignments, error: historyAssignmentsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, role, is_active, mobile')
      .eq('id', user.id)
      .single(),

    supabase
      .from('delivery_assignments')
      .select(`
        id,
        status,
        order_id,
        assigned_at,
        accepted_at,
        picked_up_at,
        out_for_delivery_at,
        delivered_at,
        cash_collected,
        orders (
          order_number,
          total,
          delivery_fee,
          payment_method,
          payment_status,
          customer_addresses (
            village_city,
            address_line
          )
        )
      `)
      .eq('delivery_partner_id', user.id)
      .in('status', ACTIVE_STATUSES)
      .order('assigned_at', { ascending: true }),

    supabase
      .from('delivery_assignments')
      .select(`
        id,
        status,
        order_id,
        assigned_at,
        accepted_at,
        picked_up_at,
        out_for_delivery_at,
        delivered_at,
        cash_collected,
        orders (
          order_number,
          total,
          delivery_fee,
          payment_method,
          payment_status,
          customer_addresses (
            village_city,
            address_line
          )
        )
      `)
      .eq('delivery_partner_id', user.id)
      .in('status', HISTORY_STATUSES)
      .order('delivered_at', { ascending: false })
      .limit(50),
  ]);

  /*
   * Authorization
   */
  if (
    !profile ||
    profileError ||
    profile.role !== 'delivery_partner' ||
    !profile.is_active
  ) {
    redirect('/auth/login?error=delivery_access_denied');
  }

  const dataError =
    activeAssignmentsError?.message ||
    historyAssignmentsError?.message ||
    null;

  if (activeAssignmentsError) {
    console.error(
      'Active delivery assignments query failed:',
      activeAssignmentsError,
    );
  }

  if (historyAssignmentsError) {
    console.error(
      'Delivery history query failed:',
      historyAssignmentsError,
    );
  }

  const active = (activeAssignments ?? []) as DeliveryAssignment[];
  const history = (historyAssignments ?? []) as DeliveryAssignment[];

  /*
   * --------------------------------------------------------------------------
   * TODAY'S METRICS
   * --------------------------------------------------------------------------
   */

  const allRecent = [...active, ...history];

  const assignedToday = allRecent.filter(
    (assignment) =>
      assignment.assigned_at &&
      assignment.assigned_at >= todayStart,
  ).length;

  const acceptedToday = allRecent.filter(
    (assignment) =>
      assignment.accepted_at &&
      assignment.accepted_at >= todayStart,
  ).length;

  const deliveredToday = history.filter(
    (assignment) =>
      assignment.status === 'delivered' &&
      assignment.delivered_at &&
      assignment.delivered_at >= todayStart,
  );

  const failedToday = history.filter(
    (assignment) => {
      /*
       * Failed assignments may not have delivered_at.
       * We therefore use assigned_at as the date fallback.
       */
      const timestamp =
        assignment.delivered_at ??
        assignment.assigned_at;

      return (
        assignment.status === 'failed' &&
        timestamp &&
        timestamp >= todayStart
      );
    },
  );

  const deliveredCount = deliveredToday.length;
  const failedCount = failedToday.length;

  const completedOrFailedToday =
    deliveredCount + failedCount;

  const successRate =
    completedOrFailedToday > 0
      ? Math.round(
          (deliveredCount / completedOrFailedToday) * 100,
        )
      : 0;

  const cashCollectedToday = deliveredToday.reduce(
    (sum, assignment) =>
      sum + Number(assignment.cash_collected ?? 0),
    0,
  );

  /*
   * Delivery fees are shown separately.
   *
   * IMPORTANT:
   * delivery_fee is the fee charged on the order. The current schema
   * does not contain a delivery-partner earning/incentive field, so
   * this must not be presented as partner income.
   */
  const deliveryFeesToday = deliveredToday.reduce(
    (sum, assignment) => {
      const order = normalizeOrder(assignment.orders);

      return sum + Number(order?.delivery_fee ?? 0);
    },
    0,
  );

  const activeDeliveries = active.length;

  /*
   * --------------------------------------------------------------------------
   * PARTNER DISPLAY
   * --------------------------------------------------------------------------
   */

  const firstName =
    profile.full_name?.trim().split(/\s+/)[0] ||
    'Partner';

  const initials =
    profile.full_name?.trim()?.[0]?.toUpperCase() ||
    'P';

  const todayLabel = new Intl.DateTimeFormat(
    'en-IN',
    {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    },
  ).format(now);

  return (
    <main className="min-h-screen bg-slate-50 pb-8">
      <div className="mx-auto w-full max-w-4xl px-3 pb-8 pt-3 sm:px-5 sm:pt-5">

        {/* ------------------------------------------------------------------ */}
        {/* HEADER                                                             */}
        {/* ------------------------------------------------------------------ */}

        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-lg">
          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg ring-1 ring-white/10"
                    aria-hidden="true"
                  >
                    🚚
                  </span>

                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-white/55 sm:text-[11px]">
                    Pandurang Milk Product
                  </p>
                </div>

                <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Good day, {firstName}
                </h1>

                <p className="mt-1.5 max-w-md text-sm leading-5 text-white/60">
                  Your delivery operations, performance and earnings
                  overview.
                </p>
              </div>

              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold ring-1 ring-white/10"
                aria-label={`Account for ${
                  profile.full_name || 'Partner'
                }`}
              >
                {initials}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/10">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400"
                aria-hidden="true"
              />

              <span className="text-xs font-semibold text-white/85">
                Account active
              </span>

              <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-white/45">
                Delivery Partner
              </span>
            </div>
          </div>
        </header>

        {/* ------------------------------------------------------------------ */}
        {/* TODAY'S PERFORMANCE                                                */}
        {/* ------------------------------------------------------------------ */}

        <section
          className="mt-5"
          aria-labelledby="today-summary"
        >
          <div className="mb-2.5 flex items-center justify-between px-1">
            <div>
              <h2
                id="today-summary"
                className="text-sm font-bold text-slate-900"
              >
                Today&apos;s performance
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Delivery activity for {todayLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <StatCard
              icon="📦"
              label="Active"
              value={activeDeliveries}
              emphasis={activeDeliveries > 0}
            />

            <StatCard
              icon="✓"
              label="Accepted"
              value={acceptedToday}
            />

            <StatCard
              icon="✓"
              label="Delivered"
              value={deliveredCount}
              success={deliveredCount > 0}
            />

            <StatCard
              icon="!"
              label="Failed"
              value={failedCount}
              danger={failedCount > 0}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* FINANCIAL SUMMARY                                                  */}
        {/* ------------------------------------------------------------------ */}

        <section
          className="mt-3"
          aria-labelledby="financial-summary"
        >
          <h2
            id="financial-summary"
            className="sr-only"
          >
            Financial summary
          </h2>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <MoneyCard
              label="COD collected"
              value={cashCollectedToday}
              tone="amber"
            />

            <MoneyCard
              label="Delivery fees"
              value={deliveryFeesToday}
              tone="blue"
            />

            <StatCard
              icon="%"
              label="Success rate"
              value={`${successRate}%`}
              success={successRate >= 90}
            />

            <StatCard
              icon="✓"
              label="Completed"
              value={deliveredCount}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* EARNINGS NOTE                                                      */}
        {/* ------------------------------------------------------------------ */}

        <section className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700">
              ₹
            </div>

            <div className="min-w-0">
              <h2 className="text-xs font-bold text-indigo-950">
                Partner earnings
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-indigo-700">
                Delivery fees are shown above. A separate partner
                earning/incentive amount is not configured in the
                current delivery data, so customer delivery fees are
                not counted as your personal income.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DATABASE ERROR                                                     */}
        {/* ------------------------------------------------------------------ */}

        {dataError && (
          <section
            role="alert"
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <div className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-sm font-bold text-red-700"
                aria-hidden="true"
              >
                !
              </span>

              <div className="min-w-0">
                <p className="text-sm font-bold text-red-900">
                  Delivery data could not be loaded
                </p>

                <p className="mt-1 break-words text-xs leading-5 text-red-700">
                  {dataError}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ACTIVE DELIVERIES                                                  */}
        {/* ------------------------------------------------------------------ */}

        <section
          className="mt-7"
          aria-labelledby="my-deliveries"
        >
          <div className="flex items-end justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
                Work queue
              </p>

              <h2
                id="my-deliveries"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                My deliveries
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Complete each delivery in order.
              </p>
            </div>

            {activeDeliveries > 0 && (
              <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100">
                {activeDeliveries} active
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {active.map((assignment) => {
              const order = normalizeOrder(
                assignment.orders,
              );

              const customerAddress =
                normalizeAddress(
                  order?.customer_addresses,
                );

              return (
                <DeliveryAssignmentCard
                  key={assignment.id}
                  assignmentId={assignment.id}
                  orderNumber={
                    order?.order_number ?? '—'
                  }
                  total={Number(order?.total ?? 0)}
                  paymentMethod={
                    order?.payment_method ?? 'cod'
                  }
                  address={[
                    customerAddress?.address_line,
                    customerAddress?.village_city,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  status={assignment.status}
                />
              );
            })}

            {!dataError &&
              active.length === 0 && (
                <EmptyDeliveries />
              )}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DELIVERY HISTORY                                                   */}
        {/* ------------------------------------------------------------------ */}

        <section
          className="mt-7"
          aria-labelledby="delivery-history"
        >
          <div className="flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                Completed work
              </p>

              <h2
                id="delivery-history"
                className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                Delivery history
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your latest completed and failed deliveries.
              </p>
            </div>

            {history.length > 0 && (
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">
                {history.length} records
              </span>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {history.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {history.map((assignment) => (
                  <DeliveryHistoryRow
                    key={assignment.id}
                    assignment={assignment}
                  />
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg">
                  📋
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  No delivery history yet
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Completed deliveries will appear here.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* PERFORMANCE DETAILS                                                */}
        {/* ------------------------------------------------------------------ */}

        <section
          className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          aria-labelledby="performance-details"
        >
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm text-emerald-700"
                aria-hidden="true"
              >
                ✓
              </span>

              <div className="min-w-0">
                <h2
                  id="performance-details"
                  className="text-sm font-bold text-slate-900"
                >
                  Today&apos;s delivery performance
                </h2>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  A quick view of your completed work.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
            <PerformanceItem
              label="Assigned"
              value={assignedToday}
            />

            <PerformanceItem
              label="Accepted"
              value={acceptedToday}
            />

            <PerformanceItem
              label="Successful"
              value={deliveredCount}
            />

            <PerformanceItem
              label="Failed"
              value={failedCount}
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* DELIVERY CHECKLIST                                                 */}
        {/* ------------------------------------------------------------------ */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-sm"
                aria-hidden="true"
              >
                ✓
              </span>

              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">
                  Delivery checklist
                </h2>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Keep these steps consistent for every order.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <ChecklistRow
              number="1"
              title="Accept before starting"
            />

            <ChecklistRow
              number="2"
              title="For COD, collect the exact amount"
            />

            <ChecklistRow
              number="3"
              title="Ask the customer for the delivery OTP"
            />

            <ChecklistRow
              number="4"
              title="Confirm delivery only after OTP verification"
            />
          </div>
        </section>

        {/* ------------------------------------------------------------------ */}
        {/* ACCOUNT                                                            */}
        {/* ------------------------------------------------------------------ */}

        <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Account
              </p>

              <p className="mt-1 truncate text-base font-bold text-slate-900">
                {profile.full_name || 'Partner'}
              </p>

              {profile.mobile && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {profile.mobile}
                </p>
              )}
            </div>

            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              Active
            </span>
          </div>
        </section>

        <p className="px-2 pt-5 text-center text-[10px] text-slate-400">
          Pandurang Milk Product • Delivery Operations
        </p>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeOrder(
  value: DeliveryAssignment['orders'],
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeAddress(
  value:
    | {
        village_city: string | null;
        address_line: string | null;
      }
    | {
        village_city: string | null;
        address_line: string | null;
      }[]
    | null
    | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

/* -------------------------------------------------------------------------- */
/* SUMMARY CARD                                                               */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  emphasis = false,
  success = false,
  danger = false,
}: {
  icon: string;
  label: string;
  value: number | string;
  emphasis?: boolean;
  success?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? 'border-red-200 ring-1 ring-red-100'
    : success
      ? 'border-emerald-200 ring-1 ring-emerald-100'
      : emphasis
        ? 'border-brand-200 ring-1 ring-brand-100'
        : 'border-slate-200';

  return (
    <div
      className={`min-w-0 rounded-2xl border bg-white p-3 shadow-sm sm:p-4 ${borderClass}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-sm sm:text-base"
          aria-hidden="true"
        >
          {icon}
        </span>

        {(emphasis || success || danger) && (
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              danger
                ? 'bg-red-500'
                : success
                  ? 'bg-emerald-500'
                  : 'bg-brand-500'
            }`}
            aria-hidden="true"
          />
        )}
      </div>

      <p className="mt-2.5 truncate text-lg font-bold tracking-tight text-slate-900 sm:mt-3 sm:text-xl">
        {value}
      </p>

      <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MONEY CARD                                                                 */
/* -------------------------------------------------------------------------- */

function MoneyCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'blue';
}) {
  const toneClasses =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div
      className={`min-w-0 rounded-2xl border p-3 shadow-sm sm:p-4 ${toneClasses}`}
    >
      <div
        className="text-sm font-bold"
        aria-hidden="true"
      >
        ₹
      </div>

      <p className="mt-2 truncate text-lg font-bold tracking-tight sm:text-xl">
        ₹
        {value.toLocaleString('en-IN', {
          maximumFractionDigits: 2,
        })}
      </p>

      <p className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wide opacity-70 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* PERFORMANCE ITEM                                                           */
/* -------------------------------------------------------------------------- */

function PerformanceItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-lg font-bold tracking-tight text-slate-950">
        {value}
      </p>

      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DELIVERY HISTORY ROW                                                       */
/* -------------------------------------------------------------------------- */

function DeliveryHistoryRow({
  assignment,
}: {
  assignment: DeliveryAssignment;
}) {
  const order = normalizeOrder(
    assignment.orders,
  );

  const isDelivered =
    assignment.status === 'delivered';

  const address = normalizeAddress(
    order?.customer_addresses,
  );

  const acceptedLabel = formatDateTime(
    assignment.accepted_at,
  );

  const completedLabel = isDelivered
    ? formatDateTime(assignment.delivered_at)
    : formatDateTime(
        assignment.assigned_at,
      );

  return (
    <article className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
            isDelivered
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}
          aria-hidden="true"
        >
          {isDelivered ? '✓' : '!'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Delivery order
              </p>

              <h3 className="mt-0.5 truncate text-sm font-bold text-slate-950">
                #{order?.order_number ?? '—'}
              </h3>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                isDelivered
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-100'
              }`}
            >
              {isDelivered
                ? 'Successful'
                : 'Failed'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <HistoryValue
              label="Order amount"
              value={`₹${Number(
                order?.total ?? 0,
              ).toLocaleString('en-IN')}`}
            />

            <HistoryValue
              label="Payment"
              value={
                isCod(
                  order?.payment_method,
                )
                  ? 'COD'
                  : 'Online'
              }
            />

            <HistoryValue
              label="Accepted"
              value={acceptedLabel}
            />

            <HistoryValue
              label={
                isDelivered
                  ? 'Delivered'
                  : 'Updated'
              }
              value={completedLabel}
            />
          </div>

          {isDelivered &&
            Number(
              assignment.cash_collected ?? 0,
            ) > 0 && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold text-amber-800">
                    COD collected
                  </span>

                  <span className="text-xs font-bold text-amber-950">
                    ₹
                    {Number(
                      assignment.cash_collected,
                    ).toLocaleString(
                      'en-IN',
                      {
                        maximumFractionDigits: 2,
                      },
                    )}
                  </span>
                </div>
              </div>
            )}

          {address &&
            (address.address_line ||
              address.village_city) && (
              <p className="mt-3 truncate text-[10px] leading-4 text-slate-400">
                📍{' '}
                {[
                  address.address_line,
                  address.village_city,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            )}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* HISTORY VALUE                                                              */
/* -------------------------------------------------------------------------- */

function HistoryValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DATE FORMAT                                                                */
/* -------------------------------------------------------------------------- */

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    },
  ).format(date);
}

/* -------------------------------------------------------------------------- */
/* PAYMENT                                                                    */
/* -------------------------------------------------------------------------- */

function isCod(
  paymentMethod: string | null | undefined,
) {
  return (
    String(paymentMethod ?? '')
      .trim()
      .toLowerCase() === 'cod'
  );
}

/* -------------------------------------------------------------------------- */
/* CHECKLIST ROW                                                              */
/* -------------------------------------------------------------------------- */

function ChecklistRow({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-5 py-3.5 sm:px-6">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600"
        aria-hidden="true"
      >
        {number}
      </span>

      <p className="text-xs font-medium leading-5 text-slate-700 sm:text-sm">
        {title}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

function EmptyDeliveries() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm sm:py-14">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600"
        aria-hidden="true"
      >
        ✓
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-900">
        You&apos;re all caught up
      </h3>

      <p className="mx-auto mt-1.5 max-w-xs text-xs leading-5 text-slate-500">
        No active deliveries right now. New assignments from
        the admin will appear here.
      </p>
    </div>
  );
}