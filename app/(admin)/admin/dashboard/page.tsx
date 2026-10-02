import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

/*
 * ============================================================
 * DASHBOARD CONFIGURATION
 * ============================================================
 */

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  total: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  delivery_status: string;
  created_at: string;
  profiles:
    | {
        full_name: string | null;
        mobile: string | null;
      }[]
    | null;
};

type ProductRow = {
  id: string;
  name: string;
  name_marathi: string | null;
  available_quantity: number;
  min_stock_level: number;
  is_active: boolean;
};

/*
 * Revenue is based on operational order states.
 *
 * Cancelled/rejected orders are intentionally excluded.
 */
const REVENUE_STATUSES = [
  'confirmed',
  'payment_confirmed',
  'packing',
  'packed',
  'assigned',
  'out_for_delivery',
  'delivered',
];

const PENDING_CONFIRMATION_STATUSES = [
  'placed',
];

const PAYMENT_REVIEW_STATUSES = [
  'payment_submitted',
];

const PACKING_STATUSES = [
  'packing',
];

const DELIVERY_STATUSES = [
  'assigned',
  'out_for_delivery',
];

const CANCELLED_STATUSES = [
  'cancelled',
  'rejected',
];

/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function getIndiaTodayRange() {
  const now = new Date();

  const indiaFormatter = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  );

  const parts =
    indiaFormatter.formatToParts(now);

  const year = parts.find(
    (part) => part.type === 'year',
  )?.value;

  const month = parts.find(
    (part) => part.type === 'month',
  )?.value;

  const day = parts.find(
    (part) => part.type === 'day',
  )?.value;

  if (!year || !month || !day) {
    throw new Error(
      'Could not determine India date.',
    );
  }

  const date = `${year}-${month}-${day}`;

  /*
   * Calculate tomorrow using UTC date arithmetic.
   * The resulting calendar date is then converted back
   * into an India-time boundary.
   */
  const nextDateObject = new Date(
    `${date}T00:00:00.000Z`,
  );

  nextDateObject.setUTCDate(
    nextDateObject.getUTCDate() + 1,
  );

  const nextDate = nextDateObject
    .toISOString()
    .slice(0, 10);

  return {
    date,

    start: `${date}T00:00:00+05:30`,

    end: `${nextDate}T00:00:00+05:30`,
  };
}

/*
 * ============================================================
 * FORMATTERS
 * ============================================================
 */

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    'en-IN',
    {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    },
  ).format(Number(value) || 0);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(
    'en-IN',
    {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    'en-IN',
    {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(new Date(value));
}

/*
 * ============================================================
 * ORDER HELPERS
 * ============================================================
 */

function getCustomerName(
  order: OrderRow,
) {
  return (
    order.profiles?.[0]?.full_name ||
    'Customer'
  );
}

function getCustomerMobile(
  order: OrderRow,
) {
  return (
    order.profiles?.[0]?.mobile ||
    null
  );
}

function getPaymentLabel(
  method: string,
) {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery';

    case 'upi_qr':
      return 'UPI QR';

    default:
      return method
        ? method.replace(/_/g, ' ')
        : 'Unknown';
  }
}

/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const {
    date,
    start,
    end,
  } = getIndiaTodayRange();

  /*
   * ==========================================================
   * FETCH TODAY'S ORDERS
   * ==========================================================
   */

  const todayOrdersPromise =
    supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        total,
        order_status,
        payment_status,
        payment_method,
        delivery_status,
        created_at,

        profiles!orders_customer_id_fkey (
          full_name,
          mobile
        )
      `)
      .gte(
        'created_at',
        start,
      )
      .lt(
        'created_at',
        end,
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      );

  /*
   * ==========================================================
   * FETCH TODAY'S DELIVERY ORDERS
   * ==========================================================
   *
   * Important:
   * The previous implementation counted ALL assigned/
   * out-for-delivery orders, not today's operational queue.
   */

  const todayDeliveryPromise =
    supabase
      .from('orders')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .in(
        'delivery_status',
        DELIVERY_STATUSES,
      )
      .gte(
        'created_at',
        start,
      )
      .lt(
        'created_at',
        end,
      );

  /*
   * ==========================================================
   * FETCH ACTIVE PRODUCTS
   * ==========================================================
   */

  const productsPromise =
    supabase
      .from('products')
      .select(`
        id,
        name,
        name_marathi,
        available_quantity,
        min_stock_level,
        is_active
      `)
      .eq(
        'is_active',
        true,
      )
      .order(
        'name',
        {
          ascending: true,
        },
      );

  /*
   * ==========================================================
   * PARALLEL DATA FETCHING
   * ==========================================================
   *
   * These queries do not depend on each other, so execute
   * them together instead of creating a request waterfall.
   */

  const [
    todayOrdersResult,
    deliveryResult,
    productsResult,
  ] = await Promise.all([
    todayOrdersPromise,
    todayDeliveryPromise,
    productsPromise,
  ]);

  /*
   * ==========================================================
   * NORMALIZE ORDERS
   * ==========================================================
   */

  if (todayOrdersResult.error) {
    console.error(
      'ADMIN DASHBOARD ORDERS ERROR:',
      todayOrdersResult.error,
    );
  }

  const todayOrders: OrderRow[] =
    (
      todayOrdersResult.data ?? []
    ).map((order) => ({
      id: String(order.id),

      order_number:
        String(order.order_number),

      customer_id:
        String(order.customer_id),

      total:
        Number(order.total ?? 0),

      order_status:
        String(
          order.order_status ??
            'placed',
        ),

      payment_status:
        String(
          order.payment_status ??
            'pending',
        ),

      payment_method:
        String(
          order.payment_method ??
            '',
        ),

      delivery_status:
        String(
          order.delivery_status ??
            'unassigned',
        ),

      created_at:
        String(order.created_at),

      profiles:
        Array.isArray(
          order.profiles,
        )
          ? order.profiles.map(
              (profile) => ({
                full_name:
                  profile?.full_name ??
                  null,

                mobile:
                  profile?.mobile ??
                  null,
              }),
            )
          : null,
    }));

  /*
   * ==========================================================
   * DELIVERY COUNT
   * ==========================================================
   */

  if (deliveryResult.error) {
    console.error(
      'ADMIN DASHBOARD DELIVERY ERROR:',
      deliveryResult.error,
    );
  }

  const pendingDeliveryCount =
    Number(
      deliveryResult.count ?? 0,
    );

  /*
   * ==========================================================
   * NORMALIZE PRODUCTS
   * ==========================================================
   */

  if (productsResult.error) {
    console.error(
      'ADMIN DASHBOARD PRODUCTS ERROR:',
      productsResult.error,
    );
  }

  const products: ProductRow[] =
    (
      productsResult.data ?? []
    ).map((product) => ({
      id: String(product.id),

      name:
        String(
          product.name ?? '',
        ),

      name_marathi:
        product.name_marathi ??
        null,

      available_quantity:
        Number(
          product.available_quantity ??
            0,
        ),

      min_stock_level:
        Number(
          product.min_stock_level ??
            0,
        ),

      is_active:
        Boolean(
          product.is_active,
        ),
    }));

  /*
   * ==========================================================
   * DASHBOARD METRICS
   * ==========================================================
   */

  const todayOrderCount =
    todayOrders.length;

  const revenueOrders =
    todayOrders.filter(
      (order) =>
        REVENUE_STATUSES.includes(
          order.order_status,
        ),
    );

  const todayRevenue =
    revenueOrders.reduce(
      (sum, order) =>
        sum +
        Number(
          order.total || 0,
        ),
      0,
    );

  const pendingConfirmationOrders =
    todayOrders.filter(
      (order) =>
        PENDING_CONFIRMATION_STATUSES.includes(
          order.order_status,
        ),
    );

  const paymentReviewOrders =
    todayOrders.filter(
      (order) =>
        PAYMENT_REVIEW_STATUSES.includes(
          order.payment_status,
        ),
    );

  const packingOrders =
    todayOrders.filter(
      (order) =>
        PACKING_STATUSES.includes(
          order.order_status,
        ),
    );

  const cancelledOrders =
    todayOrders.filter(
      (order) =>
        CANCELLED_STATUSES.includes(
          order.order_status,
        ),
    );

  const activeOrders =
    todayOrders.filter(
      (order) =>
        !CANCELLED_STATUSES.includes(
          order.order_status,
        ),
    );

  /*
   * ==========================================================
   * LOW STOCK
   * ==========================================================
   */

  const lowStockProducts =
    products
      .filter(
        (product) =>
          product.available_quantity <=
          product.min_stock_level,
      )
      .sort(
        (a, b) =>
          a.available_quantity -
          b.available_quantity,
      );

  /*
   * ==========================================================
   * ATTENTION COUNT
   * ==========================================================
   */

  const attentionCount =
    pendingConfirmationOrders.length +
    paymentReviewOrders.length +
    lowStockProducts.length;

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <main className="min-w-0 pb-4">

      {/* ====================================================
          PAGE HEADER
          ==================================================== */}

      <AdminPageHeader
        title="Business Dashboard"
        description={`Today's operational overview for ${formatDate(
          `${date}T00:00:00+05:30`,
        )}.`}
      >
        <Link
          href="/admin/orders"
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          View All Orders
        </Link>

        <Link
          href="/admin/products"
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
        >
          Manage Products
        </Link>
      </AdminPageHeader>

      {/* ====================================================
          ATTENTION BAR
          ==================================================== */}

      {attentionCount > 0 ? (
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-bold text-amber-900">
                Attention required
              </p>

              <p className="mt-1 text-sm text-amber-800">
                {pendingConfirmationOrders.length >
                0
                  ? `${pendingConfirmationOrders.length} order${
                      pendingConfirmationOrders.length ===
                      1
                        ? ''
                        : 's'
                    } waiting for confirmation. `
                  : ''}

                {paymentReviewOrders.length >
                0
                  ? `${paymentReviewOrders.length} payment${
                      paymentReviewOrders.length ===
                      1
                        ? ''
                        : 's'
                    } waiting for review. `
                  : ''}

                {lowStockProducts.length >
                0
                  ? `${lowStockProducts.length} product${
                      lowStockProducts.length ===
                      1
                        ? ''
                        : 's'
                    } at or below minimum stock.`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">

              {pendingConfirmationOrders.length >
              0 ? (
                <Link
                  href="/admin/orders?status=placed"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  Review Orders
                </Link>
              ) : null}

              {paymentReviewOrders.length >
              0 ? (
                <Link
                  href="/admin/orders?status=payment_submitted"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  Review Payments
                </Link>
              ) : null}

              {lowStockProducts.length >
              0 ? (
                <Link
                  href="/admin/inventory"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100"
                >
                  Check Inventory
                </Link>
              ) : null}

            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
              ✓
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-900">
                Everything looks good
              </p>

              <p className="mt-1 text-sm text-emerald-800">
                No orders, payments, or inventory
                issues currently need attention.
              </p>
            </div>

          </div>
        </section>
      )}

      {/* ====================================================
          PRIMARY STATS
          ==================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Today's Revenue"
          value={formatCurrency(
            todayRevenue,
          )}
          description={`${revenueOrders.length} revenue order${
            revenueOrders.length ===
            1
              ? ''
              : 's'
          }`}
          href="/admin/orders?date=today&view=revenue"
          icon="₹"
        />

        <StatCard
          title="Today's Orders"
          value={String(
            todayOrderCount,
          )}
          description={`${activeOrders.length} active · ${cancelledOrders.length} cancelled`}
          href="/admin/orders?date=today"
          icon="🛒"
        />

        <StatCard
          title="Pending Confirmation"
          value={String(
            pendingConfirmationOrders.length,
          )}
          description="Orders waiting for admin confirmation"
          href="/admin/orders?status=placed"
          icon="!"
          attention={
            pendingConfirmationOrders.length >
            0
          }
        />

        <StatCard
          title="Payment Review"
          value={String(
            paymentReviewOrders.length,
          )}
          description="Customer payment submissions"
          href="/admin/orders?status=payment_submitted"
          icon="₹"
          attention={
            paymentReviewOrders.length >
            0
          }
        />

      </section>

      {/* ====================================================
          OPERATIONAL STATS
          ==================================================== */}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          title="Packing Queue"
          value={String(
            packingOrders.length,
          )}
          description="Orders currently in packing"
          href="/packing"
          icon="📦"
        />

        <StatCard
          title="Pending Delivery"
          value={String(
            pendingDeliveryCount,
          )}
          description="Today's assigned or out-for-delivery orders"
          href="/admin/delivery"
          icon="🚚"
        />

        <StatCard
          title="Low Stock"
          value={String(
            lowStockProducts.length,
          )}
          description="At or below minimum stock"
          href="/admin/inventory"
          icon="⚠"
          attention={
            lowStockProducts.length >
            0
          }
        />

        <StatCard
          title="Cancelled / Rejected"
          value={String(
            cancelledOrders.length,
          )}
          description="Today's cancelled or rejected orders"
          href="/admin/orders?status=cancelled"
          icon="×"
        />

      </section>

      {/* ====================================================
          RECENT ORDERS + WORK QUEUE
          ==================================================== */}

      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">

        {/* RECENT ORDERS */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest orders received today.
              </p>
            </div>

            <Link
              href="/admin/orders?date=today"
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              View all →
            </Link>

          </div>

          {todayOrders.length === 0 ? (
            <EmptyState
              title="No orders today"
              description="New customer orders will appear here."
            />
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[760px] text-left">

                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">

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
                        Status
                      </th>

                      <th className="px-5 py-3">
                        Time
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {todayOrders
                      .slice(0, 8)
                      .map(
                        (order) => (
                          <tr
                            key={
                              order.id
                            }
                            className="transition hover:bg-slate-50"
                          >

                            <td className="px-5 py-4">
                              <Link
                                href={`/admin/orders/${order.id}`}
                                className="font-semibold text-slate-900 hover:text-red-600"
                              >
                                #
                                {
                                  order.order_number
                                }
                              </Link>
                            </td>

                            <td className="px-5 py-4">
                              <div className="min-w-0">

                                <Link
                                  href={`/admin/users/${order.customer_id}`}
                                  className="inline-flex min-h-[48px] max-w-full items-center rounded-lg px-2 -mx-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 hover:text-red-600"
                                  aria-label={`Open profile for ${getCustomerName(order)}`}
                                >
                                  <span className="truncate">
                                    {getCustomerName(order)}
                                  </span>
                                </Link>

                                {getCustomerMobile(
                                  order,
                                ) ? (
                                  <p className="mt-0.5 px-0 text-xs text-slate-500">
                                    {
                                      getCustomerMobile(
                                        order,
                                      )
                                    }
                                  </p>
                                ) : null}

                              </div>
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-900">
                              {formatCurrency(
                                order.total,
                              )}
                            </td>

                            <td className="px-5 py-4">

                              <p className="text-xs font-medium capitalize text-slate-700">
                                {getPaymentLabel(
                                  order.payment_method,
                                )}
                              </p>

                              <div className="mt-1">
                                <AdminStatusBadge
                                  status={
                                    order.payment_status
                                  }
                                />
                              </div>

                            </td>

                            <td className="px-5 py-4">
                              <AdminStatusBadge
                                status={
                                  order.order_status
                                }
                              />
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                              {formatTime(
                                order.created_at,
                              )}
                            </td>

                          </tr>
                        ),
                      )}

                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="divide-y divide-slate-100 md:hidden">

                {todayOrders
                  .slice(0, 8)
                  .map(
                    (order) => (
                      <article
                        key={order.id}
                        className="p-4 transition active:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="inline-flex min-h-[48px] max-w-full items-center rounded-lg px-2 -mx-2 text-sm font-bold text-slate-900 hover:bg-slate-100 hover:text-red-600"
                              aria-label={`Open order ${order.order_number}`}
                            >
                              #{order.order_number}
                            </Link>

                            <Link
                              href={`/admin/users/${order.customer_id}`}
                              className="mt-1 inline-flex min-h-[48px] max-w-full items-center rounded-lg px-2 -mx-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-red-600"
                              aria-label={`Open profile for ${getCustomerName(order)}`}
                            >
                              <span className="truncate">
                                {getCustomerName(order)}
                              </span>
                            </Link>
                          </div>

                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-flex min-h-[48px] shrink-0 items-center rounded-lg px-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                            aria-label={`Open order ${order.order_number}`}
                          >
                            {formatCurrency(order.total)}
                          </Link>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <AdminStatusBadge
                            status={order.order_status}
                          />

                          <AdminStatusBadge
                            status={order.payment_status}
                          />

                          <span className="text-xs text-slate-400">
                            {formatTime(order.created_at)}
                          </span>
                        </div>

                        {getCustomerMobile(order) ? (
                          <a
                            href={`tel:${getCustomerMobile(order)}`}
                            className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-slate-500 hover:text-red-600"
                          >
                            Call {getCustomerMobile(order)}
                          </a>
                        ) : null}
                      </article>
                    ),
                  )}

              </div>
            </>
          )}
        </div>

        {/* WORK QUEUE */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-4">

            <h2 className="text-base font-bold text-slate-900">
              Work Queue
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Tasks that need staff attention.
            </p>

          </div>

          <div className="divide-y divide-slate-100">

            <WorkQueueItem
              title="Confirm orders"
              description="Review new orders waiting for confirmation."
              count={
                pendingConfirmationOrders.length
              }
              href="/admin/orders?status=placed"
              tone={
                pendingConfirmationOrders.length >
                0
                  ? 'amber'
                  : 'slate'
              }
            />

            <WorkQueueItem
              title="Review payments"
              description="Verify submitted UPI payments."
              count={
                paymentReviewOrders.length
              }
              href="/admin/orders?status=payment_submitted"
              tone={
                paymentReviewOrders.length >
                0
                  ? 'blue'
                  : 'slate'
              }
            />

            <WorkQueueItem
              title="Packing"
              description="Orders currently waiting in the packing workflow."
              count={
                packingOrders.length
              }
              href="/packing"
              tone="slate"
            />

            <WorkQueueItem
              title="Delivery"
              description="Today's assigned or out-for-delivery orders."
              count={
                pendingDeliveryCount
              }
              href="/admin/delivery"
              tone="slate"
            />

            <WorkQueueItem
              title="Inventory"
              description="Products that need stock attention."
              count={
                lowStockProducts.length
              }
              href="/admin/inventory"
              tone={
                lowStockProducts.length >
                0
                  ? 'red'
                  : 'slate'
              }
            />

          </div>
        </div>

      </section>

      {/* ====================================================
          LOW STOCK + QUICK ACTIONS
          ==================================================== */}

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* LOW STOCK */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Low Stock Alerts
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Products at or below their minimum stock.
              </p>
            </div>

            <Link
              href="/admin/inventory"
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Inventory →
            </Link>

          </div>

          {lowStockProducts.length ===
          0 ? (
            <EmptyState
              title="Stock levels are healthy"
              description="No active products are currently below their minimum stock level."
            />
          ) : (
            <div className="divide-y divide-slate-100">

              {lowStockProducts
                .slice(0, 6)
                .map(
                  (product) => (
                    /*
                     * There is currently no /admin/products/[id]
                     * route in the application, so link to the
                     * products page instead of creating a broken
                     * 404 link.
                     */
                    <Link
                      key={
                        product.id
                      }
                      href="/admin/products"
                      className="flex min-h-[76px] items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 active:bg-slate-50"
                      aria-label={`Open products management for ${product.name}`}
                    >

                      <div className="min-w-0">

                        <p className="truncate text-sm font-semibold text-slate-900">
                          {
                            product.name
                          }
                        </p>

                        {product.name_marathi ? (
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {
                              product.name_marathi
                            }
                          </p>
                        ) : null}

                        <p className="mt-1 text-xs text-slate-400">
                          Minimum:{' '}
                          {
                            product.min_stock_level
                          }
                        </p>

                      </div>

                      <div className="shrink-0 text-right">

                        <p className="text-sm font-bold text-red-600">
                          {
                            product.available_quantity
                          }
                        </p>

                        <p className="text-[11px] text-slate-400">
                          available
                        </p>

                      </div>

                    </Link>
                  ),
                )}

            </div>
          )}

        </div>

        {/* QUICK ACTIONS */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-4">

            <h2 className="text-base font-bold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Common admin tasks.
            </p>

          </div>

          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">

            <QuickAction
              href="/admin/orders?status=placed"
              icon="🛒"
              title="Confirm Orders"
              description="Review new orders"
            />

            <QuickAction
              href="/admin/orders?status=payment_submitted"
              icon="₹"
              title="Review Payments"
              description="Verify customer payments"
            />

            <QuickAction
              href="/admin/products"
              icon="🥛"
              title="Manage Products"
              description="Prices, stock and products"
            />

            <QuickAction
              href="/admin/inventory"
              icon="📦"
              title="Inventory"
              description="Stock and product levels"
            />

            <QuickAction
              href="/packing"
              icon="📋"
              title="Packing"
              description="Manage packing workflow"
            />

            <QuickAction
              href="/admin/delivery"
              icon="🚚"
              title="Delivery"
              description="Manage delivery orders"
            />

          </div>
        </div>

      </section>

      {/* ====================================================
          FOOTER INFO
          ==================================================== */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-slate-800">
              Dashboard data
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Revenue excludes cancelled and rejected
              orders. Dashboard date uses India Standard
              Time. Operational metrics are calculated
              from today's orders.
            </p>

          </div>

          <Link
            href="/admin/orders"
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            Open order management →
          </Link>

        </div>

      </section>

    </main>
  );
}

/*
 * ============================================================
 * STAT CARD
 * ============================================================
 */

function StatCard({
  title,
  value,
  description,
  href,
  icon,
  attention = false,
}: {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: string;
  attention?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title}: ${value}. Open related records.`}
      className={[
        'group block min-h-[132px] rounded-2xl border bg-white p-5 shadow-sm transition active:scale-[0.99]',
        attention
          ? 'border-amber-200 hover:border-amber-300 hover:bg-amber-50/30'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0">

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

        <div
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition',
            attention
              ? 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'
              : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200',
          ].join(' ')}
        >
          {icon}
        </div>

      </div>

      <div className="mt-4 text-xs font-semibold text-red-600 opacity-0 transition group-hover:opacity-100">
        Open →
      </div>
    </Link>
  );
}

/*
 * ============================================================
 * WORK QUEUE ITEM
 * ============================================================
 */

function WorkQueueItem({
  title,
  description,
  count,
  href,
  tone = 'slate',
}: {
  title: string;
  description: string;
  count: number;
  href: string;
  tone?:
    | 'slate'
    | 'amber'
    | 'blue'
    | 'red';
}) {
  const toneClasses = {
    slate:
      'bg-slate-100 text-slate-700',

    amber:
      'bg-amber-100 text-amber-800',

    blue:
      'bg-blue-100 text-blue-800',

    red:
      'bg-red-100 text-red-700',
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50"
    >

      <div className="min-w-0 flex-1">

        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs leading-5 text-slate-500">
          {description}
        </p>

      </div>

      <span
        className={[
          'inline-flex min-w-[34px] items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold',
          toneClasses[tone],
        ].join(' ')}
      >
        {count}
      </span>

      <span
        aria-hidden="true"
        className="text-slate-400"
      >
        →
      </span>

    </Link>
  );
}

/*
 * ============================================================
 * QUICK ACTION
 * ============================================================
 */

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base transition group-hover:bg-red-50">
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-sm font-semibold text-slate-900">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>

        </div>

      </div>
    </Link>
  );
}

/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-5 py-10 text-center">

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
        ✓
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>

    </div>
  );
}