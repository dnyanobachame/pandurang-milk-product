import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PackingTaskCard } from '@/components/packing/PackingTaskCard';

export const dynamic = 'force-dynamic';

type PackingStatus = 'pending_packing' | 'packing' | 'packed';

type ProductSummary = {
  id: string;
  name: string;
  name_marathi: string | null;
  sku: string | null;
  product_code: string | null;
  unit: string | null;
  net_quantity: number | string | null;
  selling_price: number | string | null;
  mrp: number | string | null;
  image_url: string | null;
  available_quantity: number | string | null;
  is_batch_tracked: boolean | null;
};

type OrderItemSummary = {
  quantity: number | string | null;
  unit_price: number | string | null;
  product_id: string | null;
  products: ProductSummary | ProductSummary[] | null;
};

type PackingOrder = {
  id: string;
  order_number: string;
  order_status: string | null;
  payment_status: string | null;
  payment_method: string | null;
  delivery_status: string | null;
  delivery_date: string | null;
  delivery_slot: string | null;
  total: number | string | null;
  order_items: OrderItemSummary[] | null;
};

type PackingTask = {
  id: string;
  status: string;
  checklist: Record<string, boolean> | null;
  order_id: string;
  orders: PackingOrder | PackingOrder[] | null;
};

function statusLabel(status: string) {
  switch (status) {
    case 'pending_packing':
      return 'Waiting';
    case 'packing':
      return 'In Progress';
    case 'packed':
      return 'Completed';
    default:
      return status.replace(/_/g, ' ');
  }
}

function filterLabel(status: string) {
  switch (status) {
    case 'pending_packing':
      return 'Waiting';
    case 'packing':
      return 'In Progress';
    case 'packed':
      return 'Completed';
    default:
      return 'All';
  }
}

export default async function AdminPackingPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const supabase = await createClient();

  const requestedStatus = searchParams?.status;
  const selectedStatus: 'all' | PackingStatus =
    requestedStatus === 'pending_packing' ||
    requestedStatus === 'packing' ||
    requestedStatus === 'packed'
      ? requestedStatus
      : 'all';

  const statuses: PackingStatus[] =
    selectedStatus === 'all' ? ['pending_packing', 'packing', 'packed'] : [selectedStatus];

  const { data, error } = await supabase
    .from('packing_tasks')
    .select(`
      id,
      status,
      checklist,
      order_id,
      orders(
        id,
        order_number,
        order_status,
        payment_status,
        payment_method,
        delivery_status,
        delivery_date,
        delivery_slot,
        total,
        order_items(
          quantity,
          unit_price,
          product_id,
          products(
            id,
            name,
            name_marathi,
            sku,
            product_code,
            unit,
            net_quantity,
            selling_price,
            mrp,
            image_url,
            available_quantity,
            is_batch_tracked
          )
        )
      )
    `)
    .in('status', statuses)
    .order('created_at', { ascending: false });

  const tasks = (data ?? []) as unknown as PackingTask[];

  function firstOrder(task: PackingTask) {
    return Array.isArray(task.orders) ? task.orders[0] : task.orders;
  }

  function firstProduct(item: OrderItemSummary) {
    return Array.isArray(item.products) ? item.products[0] : item.products;
  }

  function formatPrice(value: number | string | null | undefined) {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2,
        }).format(amount)
      : '—';
  }

  function formatQuantity(value: number | string | null | undefined) {
    const quantity = Number(value ?? 0);
    return Number.isFinite(quantity) ? quantity : '—';
  }

  function stageLabel(value: string | null | undefined) {
    if (!value) return 'Unknown';

    const labels: Record<string, string> = {
      placed: 'Order Placed',
      payment_pending: 'Payment Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      packed: 'Packed',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      rejected: 'Rejected',
      refund_requested: 'Refund Requested',
      refunded: 'Refunded',
    };

    return labels[value] ?? value.replace(/_/g, ' ');
  }

  const { count: totalCount } = await supabase
    .from('packing_tasks')
    .select('id', { count: 'exact', head: true });

  const { count: waitingCount } = await supabase
    .from('packing_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending_packing');

  const { count: packingCount } = await supabase
    .from('packing_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'packing');

  const { count: completedCount } = await supabase
    .from('packing_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'packed');

  const cards = [
    {
      key: 'all',
      href: '/admin/packing',
      label: 'Total Queue',
      value: totalCount ?? 0,
      description: 'All packing tasks',
      className:
        'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50',
      valueClass: 'text-slate-950',
    },
    {
      key: 'pending_packing',
      href: '/admin/packing?status=pending_packing',
      label: 'Waiting',
      value: waitingCount ?? 0,
      description: 'Waiting to be packed',
      className:
        'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100/70',
      valueClass: 'text-amber-950',
    },
    {
      key: 'packing',
      href: '/admin/packing?status=packing',
      label: 'In Progress',
      value: packingCount ?? 0,
      description: 'Currently being packed',
      className:
        'border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300 hover:bg-blue-100/70',
      valueClass: 'text-blue-950',
    },
    {
      key: 'packed',
      href: '/admin/packing?status=packed',
      label: 'Completed Packing',
      value: completedCount ?? 0,
      description: 'Successfully packed orders',
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-100/70',
      valueClass: 'text-emerald-950',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Fulfilment
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Packing Queue
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage waiting, in-progress, and completed packing tasks from one place.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Showing
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {filterLabel(selectedStatus)}
          </p>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load the packing queue. Please refresh and try again.
        </div>
      ) : null}

      {/* Clickable KPI Filters */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const active = selectedStatus === card.key;

          return (
            <Link
              key={card.key}
              href={card.href}
              aria-current={active ? 'page' : undefined}
              className={`group rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${card.className} ${
                active ? 'ring-2 ring-red-500 ring-offset-2' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{card.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${card.valueClass}`}>
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs opacity-80">{card.description}</p>
                </div>

                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  View
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Active Filter */}
      {selectedStatus !== 'all' ? (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Filter: {filterLabel(selectedStatus)}
            </p>
            <p className="text-xs text-slate-500">
              Showing only related packing tasks.
            </p>
          </div>

          <Link
            href="/admin/packing"
            className="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Show all
          </Link>
        </div>
      ) : null}

      {/* Queue */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {selectedStatus === 'packed'
                  ? 'Completed Packing'
                  : selectedStatus === 'packing'
                    ? 'Packing In Progress'
                    : selectedStatus === 'pending_packing'
                      ? 'Orders Waiting to Pack'
                      : 'Packing Tasks'}
              </h2>

              <p className="text-sm text-slate-500">
                {selectedStatus === 'packed'
                  ? 'Recently completed packing tasks.'
                  : 'Process tasks in the order they entered the queue.'}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {tasks.length} task{tasks.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                {selectedStatus === 'packed'
                  ? 'No completed packing tasks'
                  : 'No packing tasks found'}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {selectedStatus === 'packed'
                  ? 'Completed packing orders will appear here.'
                  : 'There are currently no tasks matching this filter.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const order = firstOrder(task);
                const orderNumber = order?.order_number ?? task.order_id;
                const orderItems = order?.order_items ?? [];

                return (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5"
                  >
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Order
                        </p>

                        <Link
                          href={`/admin/orders/${task.order_id}`}
                          className="inline-flex max-w-full items-center gap-2 break-all text-base font-bold text-slate-900 hover:text-red-600"
                        >
                          <span>#{orderNumber}</span>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            View order →
                          </span>
                        </Link>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                          task.status === 'packed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : task.status === 'packing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {statusLabel(task.status)}
                      </span>
                    </div>

                    {/* Order details: tap/click the order number to open the full order page. */}
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Order stage
                          </p>
                          <p className="mt-1 text-base font-bold text-slate-900">
                            {stageLabel(order?.order_status)}
                          </p>
                        </div>
                        <Link
                          href={`/admin/orders/${task.order_id}`}
                          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Open Order Details
                        </Link>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Order Stage</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">
                            {stageLabel(order?.order_status)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Payment</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">
                            {stageLabel(order?.payment_status)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Delivery</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">
                            {stageLabel(order?.delivery_status)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-white p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Order Total</p>
                          <p className="mt-1 text-xs font-semibold text-slate-800">
                            {formatPrice(order?.total)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Product details: tap/click a product row to expand its details. */}
                    <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Products in this order
                            </p>
                            <p className="mt-0.5 text-sm text-slate-600">
                              Tap a product to view full product details.
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {orderItems.length} item{orderItems.length === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>

                      {orderItems.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {orderItems.map((item, index) => {
                            const product = firstProduct(item);

                            if (!product) {
                              return (
                                <div key={`${task.id}-item-${index}`} className="p-4 text-sm text-slate-500">
                                  Product details are unavailable for this order item.
                                </div>
                              );
                            }

                            const stock = Number(product.available_quantity ?? 0);
                            const quantity = Number(item.quantity ?? 0);

                            return (
                              <details key={`${task.id}-product-${product.id}-${index}`} className="group">
                                <summary className="flex min-h-[72px] cursor-pointer list-none items-center gap-3 px-4 py-3 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 [&::-webkit-details-marker]:hidden">
                                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                    {product.image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xl">🥛</div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                      {product.name}
                                    </p>
                                    {product.name_marathi ? (
                                      <p className="truncate text-xs text-slate-500">
                                        {product.name_marathi}
                                      </p>
                                    ) : null}
                                    <p className="mt-1 text-xs text-slate-500">
                                      Qty {formatQuantity(item.quantity)} · {formatPrice(item.unit_price)} each
                                    </p>
                                  </div>

                                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 group-open:bg-red-50 group-open:text-red-700">
                                    <span className="group-open:hidden">Details ↓</span>
                                    <span className="hidden group-open:inline">Close ↑</span>
                                  </span>
                                </summary>

                                <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                                  <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
                                    <div className="h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                      {product.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={product.image_url}
                                          alt={product.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center text-3xl">🥛</div>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <h4 className="text-base font-bold text-slate-900">
                                            {product.name}
                                          </h4>
                                          {product.name_marathi ? (
                                            <p className="mt-0.5 text-sm text-slate-500">
                                              {product.name_marathi}
                                            </p>
                                          ) : null}
                                        </div>

                                        <Link
                                          href={`/admin/products/${product.id}`}
                                          className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                        >
                                          Open Product
                                        </Link>
                                      </div>

                                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <div className="rounded-lg bg-white p-3">
                                          <p className="text-[11px] uppercase tracking-wide text-slate-400">SKU</p>
                                          <p className="mt-1 break-all text-xs font-semibold text-slate-800">
                                            {product.sku || '—'}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3">
                                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Unit</p>
                                          <p className="mt-1 text-xs font-semibold text-slate-800">
                                            {product.unit || '—'}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3">
                                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Price</p>
                                          <p className="mt-1 text-xs font-semibold text-slate-800">
                                            {formatPrice(product.selling_price)}
                                          </p>
                                        </div>
                                        <div className="rounded-lg bg-white p-3">
                                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Stock</p>
                                          <p className={`mt-1 text-xs font-semibold ${stock > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {formatQuantity(stock)} available
                                          </p>
                                        </div>
                                      </div>

                                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600">
                                          Ordered: {formatQuantity(quantity)}
                                        </span>
                                        {product.net_quantity !== null ? (
                                          <span className="rounded-full bg-white px-2.5 py-1 font-medium text-slate-600">
                                            Net: {formatQuantity(product.net_quantity)} {product.unit || ''}
                                          </span>
                                        ) : null}
                                        <span className={`rounded-full px-2.5 py-1 font-medium ${product.is_batch_tracked ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {product.is_batch_tracked ? 'Batch tracked' : 'Standard stock'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-4 py-5 text-sm text-slate-500">
                          No product line items were found for this order.
                        </div>
                      )}
                    </div>

                    <PackingTaskCard
                      taskId={task.id}
                      orderNumber={orderNumber}
                      status={task.status}
                      checklist={task.checklist ?? {}}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Workflow Note */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">
          Packing workflow
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-600">
          Use the cards above to filter the packing workflow. Waiting and in-progress
          tasks can be completed using the existing checklist and packing actions.
          Completed packing is read-only here.
        </p>
      </div>
    </div>
  );
}
