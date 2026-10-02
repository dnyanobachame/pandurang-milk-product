import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import AdminOrderActions from '@/components/admin/AdminOrderActions';

type SearchParams = {
  query?: string;
  search?: string;
  status?: string;
  payment?: string;
  date?: string;
  view?: string;
  filter?: string;
};

type ProfileRow = {
  full_name: string | null;
  mobile: string | null;
  email: string | null;
};

type PaymentRow = {
  order_id: string;
  status: string | null;
  transaction_id: string | null;
  amount: number | null;
  created_at: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  total: number;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  discount: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  delivery_status: string;
  delivery_date: string | null;
  delivery_slot: string | null;
  created_at: string;
  profiles: ProfileRow | null;
  payment: PaymentRow | null;
};

const REVENUE_STATUSES = [
  'confirmed',
  'payment_confirmed',
  'packing',
  'packed',
  'assigned',
  'out_for_delivery',
  'delivered',
];

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Orders',
  },
  {
    value: 'placed',
    label: 'Pending Confirmation',
  },
  {
    value: 'payment_pending',
    label: 'Payment Pending',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
  },
  {
    value: 'packing',
    label: 'Packing',
  },
  {
    value: 'packed',
    label: 'Packed',
  },
  {
    value: 'assigned',
    label: 'Assigned',
  },
  {
    value: 'out_for_delivery',
    label: 'Out for Delivery',
  },
  {
    value: 'delivered',
    label: 'Delivered',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
  {
    value: 'rejected',
    label: 'Rejected',
  },
];

const PAYMENT_STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All Payment Statuses',
  },
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'payment_initiated',
    label: 'Payment Initiated',
  },
  {
    value: 'payment_submitted',
    label: 'Payment Review',
  },
  {
    value: 'paid',
    label: 'Paid',
  },
  {
    value: 'failed',
    label: 'Failed',
  },
  {
    value: 'refunded',
    label: 'Refunded',
  },
];

const PAYMENT_METHOD_OPTIONS = [
  {
    value: 'all',
    label: 'All Payment Methods',
  },
  {
    value: 'cod',
    label: 'Cash on Delivery',
  },
  {
    value: 'upi_qr',
    label: 'UPI QR',
  },
];

function getIndiaToday() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date());
}

function formatDateKey(value: Date) {
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayRange() {
  const date = getIndiaToday();
  const [year, month, day] = date.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));

  return {
    date,
    start: `${date}T00:00:00+05:30`,
    end: `${formatDateKey(nextDay)}T00:00:00+05:30`,
  };
}

function getOrderDateRange(value: string) {
  if (value === 'today') {
    return getTodayRange();
  }

  const today = getIndiaToday();
  const [year, month, day] = today.split('-').map(Number);

  if (value === 'last30') {
    const startDate = new Date(Date.UTC(year, month - 1, day - 29));
    const endDate = new Date(Date.UTC(year, month - 1, day + 1));
    const start = formatDateKey(startDate);
    const end = formatDateKey(endDate);

    return {
      date: 'last30',
      start: `${start}T00:00:00+05:30`,
      end: `${end}T00:00:00+05:30`,
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [targetYear, targetMonth, targetDay] = value.split('-').map(Number);
    const nextDay = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay + 1));

    return {
      date: value,
      start: `${value}T00:00:00+05:30`,
      end: `${formatDateKey(nextDay)}T00:00:00+05:30`,
    };
  }

  return null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function getCustomerName(order: OrderRow) {
  return (
    order.profiles?.full_name ||
    'Customer'
  );
}

function getCustomerMobile(order: OrderRow) {
  return order.profiles?.mobile || null;
}

function getCustomerEmail(order: OrderRow) {
  return order.profiles?.email || null;
}

function getEffectivePaymentStatus(order: OrderRow) {
  return (
    order.payment?.status ||
    order.payment_status ||
    'pending'
  );
}

function paymentMethodLabel(value: string) {
  if (value === 'cod') {
    return 'Cash on Delivery';
  }

  if (value === 'upi_qr') {
    return 'UPI QR';
  }

  return value
    ? value.replace(/_/g, ' ')
    : 'Unknown';
}

function paymentStatusLabel(value: string) {
  if (value === 'payment_submitted') {
    return 'Payment Review';
  }

  if (value === 'payment_initiated') {
    return 'Payment Initiated';
  }

  if (value === 'paid') {
    return 'Paid';
  }

  if (value === 'pending') {
    return 'Pending';
  }

  if (value === 'failed') {
    return 'Failed';
  }

  if (value === 'refunded') {
    return 'Refunded';
  }

  return value
    ? value.replace(/_/g, ' ')
    : 'Unknown';
}

function createOrdersUrl(
  params: Record<string, string | undefined>
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value &&
        value !== 'all' &&
        value !== ''
      ) {
        search.set(key, value);
      }
    }
  );

  const query = search.toString();

  return query
    ? `/admin/orders?${query}`
    : '/admin/orders';
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();

  const query = (
    searchParams?.query ??
    searchParams?.search ??
    ''
  ).trim();

  // Keep compatibility with the AdminSidebar's legacy filter URLs.
  // The sidebar historically used ?filter=..., while the Orders page
  // uses explicit status/date parameters. Without this normalization,
  // clicking Today's Orders / Payment Verification changed the URL but
  // left the dataset unfiltered.
  const legacyFilter =
    searchParams?.filter ?? '';

  const status =
    searchParams?.status ??
    (legacyFilter === 'pending_confirmation'
      ? 'placed'
      : legacyFilter === 'payment_review'
        ? 'payment_submitted'
        : 'all');

  const payment =
    searchParams?.payment ?? 'all';

  const dateFilter =
    searchParams?.date ??
    (legacyFilter === 'today'
      ? 'today'
      : 'all');

  const view =
    searchParams?.view ?? 'all';

  /*
   * payment_submitted belongs to the payments table.
   *
   * Keep compatibility with:
   * /admin/orders?status=payment_submitted
   */
  const isPaymentReviewFilter =
    status === 'payment_submitted';

  const effectiveOrderStatus =
    isPaymentReviewFilter
      ? 'all'
      : status;

  const orderDateRange =
    dateFilter !== 'all'
      ? getOrderDateRange(dateFilter)
      : null;

  /*
   * -------------------------------------------------------
   * FETCH ORDERS
   * -------------------------------------------------------
   */

  let ordersQuery = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_id,
      subtotal,
      discount,
      tax,
      delivery_fee,
      total,
      order_status,
      payment_status,
      payment_method,
      delivery_status,
      delivery_date,
      delivery_slot,
      created_at,

      profiles!orders_customer_id_fkey (
        full_name,
        mobile,
        email
      )
    `)
    .order('created_at', {
      ascending: false,
    });

  /*
   * ORDER STATUS FILTER
   */

  if (
    effectiveOrderStatus !== 'all' &&
    STATUS_OPTIONS.some(
      (option) =>
        option.value ===
        effectiveOrderStatus
    )
  ) {
    ordersQuery = ordersQuery.eq(
      'order_status',
      effectiveOrderStatus
    );
  }

  /*
   * IMPORTANT:
   *
   * Do NOT filter payment_submitted using
   * orders.payment_status.
   *
   * Customer payment submission updates
   * payments.status.
   */

  /*
   * PAYMENT METHOD FILTER
   */

  if (
    PAYMENT_METHOD_OPTIONS.some(
      (option) =>
        option.value === payment
    ) &&
    payment !== 'all'
  ) {
    ordersQuery = ordersQuery.eq(
      'payment_method',
      payment
    );
  }

  /*
   * TODAY FILTER
   */

  if (orderDateRange) {
    ordersQuery = ordersQuery
      .gte('created_at', orderDateRange.start)
      .lt('created_at', orderDateRange.end);
  }

  /*
   * FETCH ORDERS
   */

  const {
    data: ordersData,
    error: ordersError,
  } = await ordersQuery;

  if (ordersError) {
    console.error(
      'ADMIN ORDERS FETCH ERROR:',
      ordersError
    );
  }

  /*
   * -------------------------------------------------------
   * NORMALIZE ORDERS
   * -------------------------------------------------------
   *
   * IMPORTANT:
   * profiles is a many-to-one relationship.
   * Supabase can return it as an object.
   */

  let orders: OrderRow[] = (
    ordersData ?? []
  ).map((order: any) => {
    const profile = order.profiles;

    const normalizedProfile =
      profile &&
      !Array.isArray(profile)
        ? {
            full_name:
              profile.full_name ??
              null,
            mobile:
              profile.mobile ??
              null,
            email:
              profile.email ??
              null,
          }
        : Array.isArray(profile) &&
            profile.length > 0
          ? {
              full_name:
                profile[0]
                  ?.full_name ??
                null,
              mobile:
                profile[0]
                  ?.mobile ??
                null,
              email:
                profile[0]?.email ??
                null,
            }
          : null;

    return {
      id: String(order.id),
      order_number: String(
        order.order_number
      ),
      customer_id: String(
        order.customer_id
      ),
      total: Number(
        order.total ?? 0
      ),
      subtotal: Number(
        order.subtotal ?? 0
      ),
      tax: Number(
        order.tax ?? 0
      ),
      delivery_fee: Number(
        order.delivery_fee ?? 0
      ),
      discount: Number(
        order.discount ?? 0
      ),
      order_status: String(
        order.order_status ??
          'placed'
      ),
      payment_status: String(
        order.payment_status ??
          'pending'
      ),
      payment_method: String(
        order.payment_method ??
          ''
      ),
      delivery_status: String(
        order.delivery_status ??
          'unassigned'
      ),
      delivery_date:
        order.delivery_date ??
        null,
      delivery_slot:
        order.delivery_slot ??
        null,
      created_at: String(
        order.created_at
      ),
      profiles:
        normalizedProfile,
      payment: null,
    };
  });

  /*
   * -------------------------------------------------------
   * FETCH PAYMENT RECORDS
   * -------------------------------------------------------
   *
   * The payment workflow stores the actual payment state
   * in payments.status.
   *
   * Example:
   *
   * orders.payment_status = pending
   * payments.status      = payment_submitted
   *
   * That is why the Orders page must read payments.
   */

  const orderIds =
    orders.map(
      (order) => order.id
    );

  if (orderIds.length > 0) {
    const {
      data: paymentsData,
      error: paymentsError,
    } = await supabase
      .from('payments')
      .select(`
        order_id,
        status,
        transaction_id,
        amount,
        created_at
      `)
      .in(
        'order_id',
        orderIds
      )
      .order('created_at', {
        ascending: false,
      });

    if (paymentsError) {
      console.error(
        'ADMIN PAYMENTS FETCH ERROR:',
        paymentsError
      );
    } else {
      /*
       * Keep the latest payment record for
       * each order.
       */
      const paymentMap =
        new Map<
          string,
          PaymentRow
        >();

      for (
        const paymentRow of
          paymentsData ?? []
      ) {
        const orderId =
          String(
            paymentRow.order_id
          );

        if (
          !paymentMap.has(
            orderId
          )
        ) {
          paymentMap.set(
            orderId,
            {
              order_id:
                orderId,
              status:
                paymentRow.status ??
                null,
              transaction_id:
                paymentRow.transaction_id ??
                null,
              amount:
                paymentRow.amount !=
                null
                  ? Number(
                      paymentRow.amount
                    )
                  : null,
              created_at:
                paymentRow.created_at ??
                null,
            }
          );
        }
      }

      orders =
        orders.map(
          (order) => ({
            ...order,
            payment:
              paymentMap.get(
                order.id
              ) ?? null,
          })
        );
    }
  }

  /*
   * -------------------------------------------------------
   * PAYMENT STATUS FILTERING
   * -------------------------------------------------------
   *
   * Apply payment filters AFTER payment records
   * are loaded.
   */

  if (isPaymentReviewFilter) {
    orders = orders.filter(
      (order) =>
        getEffectivePaymentStatus(
          order
        ) ===
        'payment_submitted'
    );
  }

  /*
   * Support future/direct URLs such as:
   *
   * /admin/orders?payment=paid
   *
   * without confusing payment method and payment status.
   */

  const isPaymentStatusValue =
    PAYMENT_STATUS_OPTIONS.some(
      (option) =>
        option.value === payment &&
        option.value !== 'all'
    );

  if (isPaymentStatusValue) {
    orders = orders.filter(
      (order) =>
        getEffectivePaymentStatus(
          order
        ) === payment
    );
  }

  /*
   * -------------------------------------------------------
   * SEARCH
   * -------------------------------------------------------
   */

  if (query) {
    const normalizedQuery =
      query.toLowerCase();

    orders = orders.filter(
      (order) => {
        const name =
          getCustomerName(order)
            .toLowerCase();

        const mobile =
          (
            getCustomerMobile(
              order
            ) ?? ''
          ).toLowerCase();

        const email =
          (
            getCustomerEmail(
              order
            ) ?? ''
          ).toLowerCase();

        const orderNumber =
          order.order_number
            .toLowerCase();

        return (
          orderNumber.includes(
            normalizedQuery
          ) ||
          name.includes(
            normalizedQuery
          ) ||
          mobile.includes(
            normalizedQuery
          ) ||
          email.includes(
            normalizedQuery
          )
        );
      }
    );
  }

  /*
   * -------------------------------------------------------
   * SPECIAL VIEWS
   * -------------------------------------------------------
   */

  if (view === 'revenue') {
    orders = orders.filter(
      (order) =>
        REVENUE_STATUSES.includes(
          order.order_status
        )
    );
  }

  /*
   * -------------------------------------------------------
   * SUMMARY
   * -------------------------------------------------------
   */

  const totalOrders =
    orders.length;

  const totalValue =
    orders.reduce(
      (sum, order) =>
        sum +
        Number(order.total || 0),
      0
    );

  const revenueOrders =
    orders.filter(
      (order) =>
        REVENUE_STATUSES.includes(
          order.order_status
        )
    );

  const revenue =
    revenueOrders.reduce(
      (sum, order) =>
        sum +
        Number(order.total || 0),
      0
    );

  const pendingConfirmation =
    orders.filter(
      (order) =>
        order.order_status ===
        'placed'
    ).length;

  /*
   * IMPORTANT:
   *
   * Payment Review comes from payments.status.
   */
  const paymentReview =
    orders.filter(
      (order) =>
        getEffectivePaymentStatus(
          order
        ) ===
        'payment_submitted'
    ).length;

  const cancelledCount =
    orders.filter(
      (order) =>
        order.order_status ===
          'cancelled' ||
        order.order_status ===
          'rejected'
    ).length;

  /*
   * -------------------------------------------------------
   * ACTIVE FILTER LABELS
   * -------------------------------------------------------
   */

  const selectedStatusLabel =
    isPaymentReviewFilter
      ? 'Payment Review'
      : view === 'revenue'
        ? 'Revenue Orders'
        : view === 'order_value'
          ? 'Order Value'
          : STATUS_OPTIONS.find(
              (option) =>
                option.value === status
            )?.label ??
            'All Orders';

  const selectedPaymentLabel =
    PAYMENT_METHOD_OPTIONS.find(
      (option) =>
        option.value ===
        payment
    )?.label ??
    PAYMENT_STATUS_OPTIONS.find(
      (option) =>
        option.value ===
        payment
    )?.label ??
    'All Payments';

  const hasFilters =
    Boolean(query) ||
    status !== 'all' ||
    payment !== 'all' ||
    dateFilter !== 'all' ||
    view !== 'all';

  /*
   * -------------------------------------------------------
   * PAGE
   * -------------------------------------------------------
   */

  return (
    <main className="min-w-0">
      <AdminPageHeader
        title="Orders"
        description="Manage customer orders, confirmations, payments, fulfilment and delivery."
      >
        <Link
          href="/admin/dashboard"
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </AdminPageHeader>

      {/* INTERACTIVE SUMMARY / METADATA */}

      <section
        aria-label="Order metadata filters"
        className="grid grid-cols-2 gap-3 lg:grid-cols-6"
      >
        <SummaryCard
          href="/admin/orders"
          label="Orders"
          value={String(totalOrders)}
          description="All matching orders"
          active={
            status === 'all' &&
            payment === 'all' &&
            dateFilter === 'all' &&
            view === 'all' &&
            !query
          }
        />

        <SummaryCard
          href="/admin/orders?view=order_value"
          label="Order Value"
          value={formatCurrency(totalValue)}
          description="Order value"
          active={view === 'order_value'}
        />

        <SummaryCard
          href="/admin/orders?view=revenue"
          label="Revenue"
          value={formatCurrency(revenue)}
          description="Revenue orders"
          active={view === 'revenue'}
        />

        <SummaryCard
          href="/admin/orders?status=placed"
          label="Confirmation"
          value={String(pendingConfirmation)}
          description="Waiting for confirmation"
          active={status === 'placed'}
          attention={pendingConfirmation > 0}
        />

        <SummaryCard
          href="/admin/orders?status=payment_submitted"
          label="Payment Review"
          value={String(paymentReview)}
          description="Needs payment review"
          active={status === 'payment_submitted'}
          attention={paymentReview > 0}
        />

        <SummaryCard
          href="/admin/orders?status=cancelled"
          label="Cancelled"
          value={String(cancelledCount)}
          description="Cancelled / rejected"
          active={status === 'cancelled'}
        />
      </section>

      {/* QUICK FILTERS */}

      <section className="mt-6 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          <FilterLink
            href="/admin/orders"
            active={
              status === 'all' &&
              view === 'all' &&
              dateFilter === 'all'
            }
          >
            All
          </FilterLink>

          <FilterLink
            href="/admin/orders?status=placed"
            active={
              status === 'placed'
            }
            attention={
              pendingConfirmation >
              0
            }
          >
            Pending Confirmation
            {pendingConfirmation >
            0
              ? ` (${pendingConfirmation})`
              : ''}
          </FilterLink>

          <FilterLink
            href="/admin/orders?status=payment_submitted"
            active={
              status ===
              'payment_submitted'
            }
            attention={
              paymentReview > 0
            }
          >
            Payment Review
            {paymentReview > 0
              ? ` (${paymentReview})`
              : ''}
          </FilterLink>

          <FilterLink
            href="/admin/orders?date=today"
            active={
              dateFilter === 'today'
            }
          >
            Today
          </FilterLink>

          <FilterLink
            href="/admin/orders?view=revenue"
            active={
              view === 'revenue'
            }
          >
            Revenue Orders
          </FilterLink>

          <FilterLink
            href="/admin/orders?status=cancelled"
            active={
              status === 'cancelled'
            }
          >
            Cancelled
          </FilterLink>
        </div>
      </section>

      {/* SEARCH */}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto]"
        >
          <div className="min-w-0">
            <label
              htmlFor="query"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Search orders
            </label>

            <input
              id="query"
              name="query"
              defaultValue={
                query
              }
              placeholder="Order number, customer, phone or email"
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Order status
            </label>

            <select
              id="status"
              name="status"
              defaultValue={
                status
              }
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              {STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}

              <option value="payment_submitted">
                Payment Review
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Payment method
            </label>

            <select
              id="payment"
              name="payment"
              defaultValue={
                PAYMENT_METHOD_OPTIONS.some(
                  (option) =>
                    option.value ===
                    payment
                )
                  ? payment
                  : 'all'
              }
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              {PAYMENT_METHOD_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
            >
              Search
            </button>

            {hasFilters ? (
              <Link
                href="/admin/orders"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Clear
              </Link>
            ) : null}
          </div>

          {dateFilter !== 'all' ? (
            <input
              type="hidden"
              name="date"
              value={dateFilter}
            />
          ) : null}

          {view ===
          'revenue' ? (
            <input
              type="hidden"
              name="view"
              value="revenue"
            />
          ) : null}
        </form>
      </section>

      {/* CURRENT VIEW */}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {selectedStatusLabel}
          </p>

          <p className="mt-0.5 text-xs text-slate-500">
            {view === 'revenue'
              ? 'Showing orders included in the revenue view.'
              : view === 'order_value'
                ? 'Showing orders contributing to the order-value view.'
                : dateFilter === 'today'
                  ? 'Showing today’s orders.'
                  : dateFilter === 'last30'
                    ? 'Showing orders from the last 30 days.'
                    : /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)
                      ? `Showing orders for ${dateFilter}.`
                      : 'Showing all matching orders.'}

            {payment !==
              'all' &&
            PAYMENT_METHOD_OPTIONS.some(
              (option) =>
                option.value ===
                payment
            )
              ? ` ${selectedPaymentLabel}.`
              : ''}

            {query
              ? ` Search: “${query}”.`
              : ''}
          </p>
        </div>

        <p className="text-xs text-slate-500">
          {totalOrders}{' '}
          {totalOrders === 1
            ? 'order'
            : 'orders'}
        </p>
      </div>

      {/* ORDERS */}

      <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <EmptyOrders
            hasFilters={
              hasFilters
            }
          />
        ) : (
          <>
            {/* DESKTOP */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1180px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">
                      Order
                    </th>

                    <th className="px-5 py-3">
                      Customer
                    </th>

                    <th className="px-5 py-3">
                      Amount
                    </th>

                    <th className="px-5 py-3">
                      Payment
                    </th>

                    <th className="px-5 py-3">
                      Order Status
                    </th>

                    <th className="px-5 py-3">
                      Delivery
                    </th>

                    <th className="px-5 py-3">
                      Created
                    </th>

                    <th className="px-5 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {orders.map(
                    (order) => {
                      const customerName =
                        getCustomerName(
                          order
                        );

                      const mobile =
                        getCustomerMobile(
                          order
                        );

                      const paymentStatus =
                        getEffectivePaymentStatus(
                          order
                        );

                      return (
                        <tr
                          key={
                            order.id
                          }
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 align-top">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-bold text-slate-900 hover:text-red-600"
                            >
                              #
                              {
                                order.order_number
                              }
                            </Link>

                            <p className="mt-1 text-xs text-slate-400">
                              ID:{' '}
                              {order.id.slice(
                                0,
                                8
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="min-w-[180px]">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="font-semibold text-slate-900 hover:text-red-600"
                              >
                                {
                                  customerName
                                }
                              </Link>

                              {mobile ? (
                                <a
                                  href={`tel:${mobile}`}
                                  className="mt-1 block text-xs text-slate-500 hover:text-red-600"
                                >
                                  {
                                    mobile
                                  }
                                </a>
                              ) : null}

                              {getCustomerEmail(
                                order
                              ) ? (
                                <p className="mt-1 truncate text-xs text-slate-400">
                                  {
                                    getCustomerEmail(
                                      order
                                    )
                                  }
                                </p>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <p className="font-bold text-slate-900">
                              {formatCurrency(
                                order.total
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Subtotal:{' '}
                              {formatCurrency(
                                order.subtotal
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <p className="text-xs font-semibold text-slate-700">
                              {paymentMethodLabel(
                                order.payment_method
                              )}
                            </p>

                            <div className="mt-1.5">
                              <AdminStatusBadge
                                status={
                                  paymentStatus
                                }
                              />
                            </div>

                            <p className="mt-1 text-[11px] text-slate-400">
                              {paymentStatusLabel(
                                paymentStatus
                              )}
                            </p>

                            {order.payment
                              ?.transaction_id ? (
                              <p className="mt-1 truncate text-[11px] font-medium text-slate-500">
                                Txn:{' '}
                                {
                                  order
                                    .payment
                                    .transaction_id
                                }
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 align-top">
                            <AdminStatusBadge
                              status={
                                order.order_status
                              }
                            />
                          </td>

                          <td className="px-5 py-4 align-top">
                            <AdminStatusBadge
                              status={
                                order.delivery_status
                              }
                            />

                            {order.delivery_date ? (
                              <p className="mt-1 text-xs text-slate-400">
                                {formatDate(
                                  `${order.delivery_date}T00:00:00+05:30`
                                )}

                                {order.delivery_slot
                                  ? ` · ${order.delivery_slot}`
                                  : ''}
                              </p>
                            ) : null}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 align-top">
                            <p className="text-xs font-medium text-slate-700">
                              {formatDate(
                                order.created_at
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatTime(
                                order.created_at
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4 align-top">
                            <div className="flex justify-end">
                              <AdminOrderActions
                                orderId={
                                  order.id
                                }
                                orderNumber={
                                  order.order_number
                                }
                                customerName={
                                  customerName
                                }
                                mobile={
                                  mobile
                                }
                                orderStatus={
                                  order.order_status
                                }
                                paymentStatus={
                                  paymentStatus
                                }
                                paymentMethod={
                                  order.payment_method
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE / TABLET */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {orders.map(
                (order) => {
                  const customerName =
                    getCustomerName(
                      order
                    );

                  const mobile =
                    getCustomerMobile(
                      order
                    );

                  const paymentStatus =
                    getEffectivePaymentStatus(
                      order
                    );

                  return (
                    <article
                      key={
                        order.id
                      }
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="truncate text-base font-bold text-slate-900 hover:text-red-600"
                          >
                            #
                            {
                              order.order_number
                            }
                          </Link>

                          <p className="mt-1 truncate text-sm font-medium text-slate-700">
                            {
                              customerName
                            }
                          </p>

                          {mobile ? (
                            <a
                              href={`tel:${mobile}`}
                              className="mt-1 inline-block text-xs font-medium text-red-600"
                            >
                              {
                                mobile
                              }
                            </a>
                          ) : null}
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-base font-bold text-slate-900">
                            {formatCurrency(
                              order.total
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatTime(
                              order.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <AdminStatusBadge
                          status={
                            order.order_status
                          }
                        />

                        <AdminStatusBadge
                          status={
                            paymentStatus
                          }
                        />

                        <AdminStatusBadge
                          status={
                            order.delivery_status
                          }
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Payment
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {paymentMethodLabel(
                              order.payment_method
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {paymentStatusLabel(
                              paymentStatus
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Created
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {formatDate(
                              order.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      {order.payment
                        ?.transaction_id ? (
                        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
                            UPI Transaction ID
                          </p>

                          <p className="mt-1 break-all text-xs font-bold text-blue-900">
                            {
                              order
                                .payment
                                .transaction_id
                            }
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-4">
                        <AdminOrderActions
                          orderId={
                            order.id
                          }
                          orderNumber={
                            order.order_number
                          }
                          customerName={
                            customerName
                          }
                          mobile={
                            mobile
                          }
                          orderStatus={
                            order.order_status
                          }
                          paymentStatus={
                            paymentStatus
                          }
                          paymentMethod={
                            order.payment_method
                          }
                        />
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </>
        )}
      </section>

      {/* INFORMATION */}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Order management
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              COD orders remain in{' '}
              <strong>
                Placed
              </strong>{' '}
              until staff confirms
              them. UPI payments remain
              pending until staff verifies
              the submitted transaction.
              Cancelled and rejected
              orders are excluded from
              the revenue calculation.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

/*
 * ========================================================
 * SUMMARY CARD
 * ========================================================
 */

function SummaryCard({
  href,
  label,
  value,
  description,
  active = false,
  attention = false,
}: {
  href: string;
  label: string;
  value: string;
  description: string;
  active?: boolean;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group relative min-w-0 rounded-2xl border bg-white p-4 shadow-sm outline-none transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 sm:p-5',
        active
          ? 'border-red-500 bg-red-50/40 ring-2 ring-red-100'
          : attention
            ? 'border-amber-300 hover:border-amber-400'
            : 'border-slate-200 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={[
            'text-xs font-semibold',
            active
              ? 'text-red-700'
              : attention
                ? 'text-amber-700'
                : 'text-slate-500',
          ].join(' ')}
        >
          {label}
        </p>

        <span
          aria-hidden="true"
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition',
            active
              ? 'bg-red-600 text-white'
              : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-700',
          ].join(' ')}
        >
          →
        </span>
      </div>

      <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {value}
      </p>

      <div className="mt-1 flex items-center gap-1.5">
        {attention && !active ? (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
          />
        ) : null}
        <p className="truncate text-[11px] font-medium text-slate-500 sm:text-xs">
          {description}
        </p>
      </div>

      {active ? (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-600">
          Selected
        </p>
      ) : null}
    </Link>
  );
}

/*
 * ========================================================
 * FILTER LINK
 * ========================================================
 */

function FilterLink({
  href,
  active,
  attention = false,
  children,
}: {
  href: string;
  active: boolean;
  attention?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex min-h-[40px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
        active
          ? 'border-red-600 bg-red-600 text-white'
          : attention
            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </Link>
  );
}

/*
 * ========================================================
 * EMPTY ORDERS
 * ========================================================
 */

function EmptyOrders({
  hasFilters,
}: {
  hasFilters: boolean;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        🛒
      </div>

      <h2 className="mt-4 text-base font-bold text-slate-900">
        {hasFilters
          ? 'No matching orders'
          : 'No orders yet'}
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? 'Try changing the search or filters to find another order.'
          : 'Customer orders will appear here when they are placed.'}
      </p>

      {hasFilters ? (
        <Link
          href="/admin/orders"
          className="mt-5 inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
        >
          Clear Filters
        </Link>
      ) : null}
    </div>
  );
}