import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

const EXCLUDED_ORDER_STATUSES = new Set([
  'cancelled',
  'rejected',
  'refund_requested',
  'refunded',
]);

type ReportOrder = {
  id: string;
  order_number: string;
  total: number | string | null;
  order_status: string | null;
  payment_method: string | null;
  created_at: string;
};

type DailyRow = {
  date: string;
  orders: number;
  revenue: number;
  cod: number;
  upi: number;
};

function getIndiaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getDateRange() {
  const today = getIndiaToday();
  const [year, month, day] = today.split('-').map(Number);

  // Last 30 calendar days including today.
  const startDate = new Date(
    Date.UTC(year, month - 1, day - 29)
  );
  const endDate = new Date(
    Date.UTC(year, month - 1, day + 1)
  );

  const format = (value: Date) => {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const start = format(startDate);
  const end = format(endDate);

  return {
    start,
    end,
    startTimestamp: `${start}T00:00:00+05:30`,
    endTimestamp: `${end}T00:00:00+05:30`,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+05:30`));
}

function getIndiaDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function paymentMethodLabel(value: string | null) {
  if (value === 'cod') return 'Cash on Delivery';
  if (value === 'upi_qr') return 'UPI QR';
  if (value === 'gateway') return 'Online Payment';
  return value ? value.replace(/_/g, ' ') : 'Unknown';
}

function makeCsv(rows: Array<Array<string | number | null | undefined>>) {
  return rows
    .map((row) =>
      row
        .map((cell) => `\"${String(cell ?? '').replace(/\"/g, '\"\"')}\"`)
        .join(',')
    )
    .join('\n');
}

function orderCsvRows(orders: ReportOrder[]) {
  return [
    ['Date', 'Order Number', 'Amount', 'Payment Method', 'Order Status', 'Created At'],
    ...orders.map((order) => [
      getIndiaDate(order.created_at),
      order.order_number,
      Number(order.total ?? 0),
      paymentMethodLabel(order.payment_method),
      order.order_status ?? '',
      order.created_at,
    ]),
  ];
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: { report?: string; view?: string };
}) {
  const supabase = createClient();
  const range = getDateRange();

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, total, order_status, payment_method, created_at'
    )
    .gte('created_at', range.startTimestamp)
    .lt('created_at', range.endTimestamp)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ADMIN REVENUE REPORT ERROR:', error);
  }

  const allRows = (data ?? []) as ReportOrder[];

  // Revenue is gross order value from valid sales. Cancelled/rejected orders
  // are excluded. We intentionally do not require orders.payment_status='paid'
  // because COD orders can be successfully delivered while that denormalized
  // field is still pending in the current backend workflow.
  const revenueOrders = allRows.filter(
    (order) => !EXCLUDED_ORDER_STATUSES.has(String(order.order_status))
  );

  const totalRevenue = revenueOrders.reduce(
    (sum, order) => sum + Number(order.total ?? 0),
    0
  );

  const codRevenue = revenueOrders
    .filter((order) => order.payment_method === 'cod')
    .reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  const upiRevenue = revenueOrders
    .filter((order) => order.payment_method === 'upi_qr')
    .reduce((sum, order) => sum + Number(order.total ?? 0), 0);

  const otherRevenue = totalRevenue - codRevenue - upiRevenue;

  const dailyMap = new Map<string, DailyRow>();

  for (const order of revenueOrders) {
    const date = getIndiaDate(order.created_at);
    const existing = dailyMap.get(date) ?? {
      date,
      orders: 0,
      revenue: 0,
      cod: 0,
      upi: 0,
    };

    const amount = Number(order.total ?? 0);
    existing.orders += 1;
    existing.revenue += amount;

    if (order.payment_method === 'cod') {
      existing.cod += amount;
    } else if (order.payment_method === 'upi_qr') {
      existing.upi += amount;
    }

    dailyMap.set(date, existing);
  }

  // Show newest active sales days first and keep zero-sales days out of the
  // main table so the report remains compact and operationally useful.
  const dailySales = Array.from(dailyMap.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const dailyCsv = makeCsv([
    ['Date', 'Orders', 'Revenue', 'COD', 'UPI'],
    ...dailySales.map((row) => [
      row.date,
      row.orders,
      row.revenue,
      row.cod,
      row.upi,
    ]),
    [],
    ['Total', revenueOrders.length, totalRevenue, codRevenue, upiRevenue],
  ]);

  const codOrders = revenueOrders.filter(
    (order) => order.payment_method === 'cod'
  );
  const upiOrders = revenueOrders.filter(
    (order) => order.payment_method === 'upi_qr'
  );

  const codCsv = makeCsv(orderCsvRows(codOrders));
  const upiCsv = makeCsv(orderCsvRows(upiOrders));

  const dailyCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(dailyCsv)}`;
  const codCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(codCsv)}`;
  const upiCsvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(upiCsv)}`;

  const reportTitle = searchParams?.report === 'revenue' ? 'Revenue' : 'Revenue';

  return (
    <main className="min-w-0">
      <AdminPageHeader
        title={reportTitle}
        description="Track gross sales, order volume and payment-method revenue for the last 30 days."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders?view=revenue"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            View Revenue Orders
          </Link>
          <Link
            href="/admin/dashboard"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            ← Dashboard
          </Link>
        </div>
      </AdminPageHeader>

      {error ? (
        <section className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Revenue data could not be loaded. Check the server log for the database error.
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/admin/orders?date=last30&view=revenue"
          label="Revenue — last 30 days"
          value={formatCurrency(totalRevenue)}
          description={`${revenueOrders.length} valid sales orders`}
        />
        <MetricCard
          href="/admin/orders?date=last30&view=revenue"
          label="Orders — last 30 days"
          value={String(revenueOrders.length)}
          description="Cancelled/rejected excluded"
        />
        <MetricCard
          href="/admin/orders?date=last30&payment=cod&view=revenue"
          label="COD revenue"
          value={formatCurrency(codRevenue)}
          description="Cash on Delivery orders"
        />
        <MetricCard
          href="/admin/orders?date=last30&payment=upi_qr&view=revenue"
          label="UPI revenue"
          value={formatCurrency(upiRevenue)}
          description={otherRevenue > 0 ? `Other: ${formatCurrency(otherRevenue)}` : 'UPI QR orders'}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily Sales</h2>
            <p className="mt-1 text-xs text-slate-500">
              {formatDay(range.start)} — {formatDay(getIndiaToday())} · India time (IST)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={dailyCsvHref}
              download="mauli-revenue-date-wise.csv"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Date-wise CSV
            </a>
            <a
              href={codCsvHref}
              download="mauli-revenue-cod.csv"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              COD CSV
            </a>
            <a
              href={upiCsvHref}
              download="mauli-revenue-upi.csv"
              className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              UPI CSV
            </a>
          </div>
        </div>

        {dailySales.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-semibold text-slate-900">No revenue orders in the last 30 days</p>
            <p className="mt-1 text-sm text-slate-500">
              Cancelled and rejected orders are not counted as revenue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3">Revenue</th>
                  <th className="px-5 py-3">COD</th>
                  <th className="px-5 py-3">UPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailySales.map((row) => (
                  <tr key={row.date} className="text-sm text-slate-700 hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?date=${row.date}&view=revenue`}
                        className="inline-flex min-h-[42px] items-center rounded-lg px-2 font-semibold text-red-600 hover:bg-red-50 hover:underline"
                      >
                        {formatDay(row.date)}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?date=${row.date}&view=revenue`}
                        className="inline-flex min-h-[42px] items-center rounded-lg px-2 font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {row.orders}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?date=${row.date}&view=revenue`}
                        className="inline-flex min-h-[42px] items-center rounded-lg px-2 font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {formatCurrency(row.revenue)}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?date=${row.date}&payment=cod&view=revenue`}
                        className="inline-flex min-h-[42px] items-center rounded-lg px-2 font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {formatCurrency(row.cod)}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?date=${row.date}&payment=upi_qr&view=revenue`}
                        className="inline-flex min-h-[42px] items-center rounded-lg px-2 font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        {formatCurrency(row.upi)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-sm font-bold text-slate-900">
                  <td className="px-5 py-4">Total</td>
                  <td className="px-5 py-4">{revenueOrders.length}</td>
                  <td className="px-5 py-4">{formatCurrency(totalRevenue)}</td>
                  <td className="px-5 py-4">{formatCurrency(codRevenue)}</td>
                  <td className="px-5 py-4">{formatCurrency(upiRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Revenue calculation</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Revenue is calculated from <span className="font-semibold">orders.total</span> for orders created during the last 30 calendar days in IST. Cancelled and rejected orders are excluded. This is a gross-sales report, not a profit or margin report.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/orders"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Open Orders
          </Link>
          <Link
            href="/admin/orders?status=cancelled"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Review Cancelled Orders
          </Link>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  href,
  label,
  value,
  description,
}: {
  href: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group min-h-[150px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 transition group-hover:bg-red-50 group-hover:text-red-600">→</span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <p className="mt-3 text-xs font-semibold text-red-600">View matching orders →</p>
    </Link>
  );
}
