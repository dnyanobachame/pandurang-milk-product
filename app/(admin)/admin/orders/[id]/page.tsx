import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAdminOrderDetails } from '@/app/actions/orders';
import AdminOrderActions from '@/components/admin/AdminOrderActions';
import AdminOrderStageManager from '@/components/admin/AdminOrderStageManager';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: {
    id: string;
  };
};

function formatMoney(value: number | null | undefined) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function displayText(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
}

function formatLabel(value: unknown) {
  return String(value ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function AdminOrderDetailsPage({
  params,
}: PageProps) {
  const orderId = String(params?.id ?? '').trim();

  if (!orderId) {
    notFound();
  }

  const result = await getAdminOrderDetails(orderId);

  if ('error' in result && result.error) {
    notFound();
  }

  if (!result.order) {
    notFound();
  }

  const order = result.order;
  const items = result.items ?? [];
  const payment = result.payment;

  /*
   * IMPORTANT:
   *
   * The actual payment workflow stores the authoritative payment
   * state in the payments table.
   *
   * Example:
   *
   * orders.payment_status = pending
   * payments.status       = payment_submitted
   *
   * Therefore the admin detail page must use payments.status
   * when a payment record exists.
   *
   * If no payment record exists, fall back to orders.payment_status.
   */
  const effectivePaymentStatus = String(
    payment?.status ?? order.payment_status ?? 'pending',
  );

  const profile = Array.isArray(order.profiles)
    ? order.profiles[0]
    : order.profiles;

  const address = Array.isArray(order.customer_addresses)
    ? order.customer_addresses[0]
    : order.customer_addresses;

  const customerName =
    profile?.full_name ||
    address?.recipient_name ||
    'Customer';

  const mobile =
    profile?.mobile ||
    address?.phone ||
    null;

  const email = profile?.email || null;

  /*
   * COD orders can be confirmed only while they
   * are still in placed status.
   */
  const canConfirm =
    order.order_status === 'placed' &&
    order.payment_method === 'cod';

  const canCancel = ![
    'cancelled',
    'delivered',
    'refunded',
  ].includes(String(order.order_status));

  /*
   * Normalize the customer phone number for WhatsApp.
   */
  const whatsappNumber = mobile
    ? String(mobile).replace(/\D/g, '')
    : '';

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : null;

  return (
    <main className="space-y-6">
      <AdminPageHeader
        title={`Order ${order.order_number}`}
        description="Review customer information, products, payment, delivery details and order status."
      >
        <Link
          href="/admin/orders"
          className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          ← Back to Orders
        </Link>
      </AdminPageHeader>

      {/* =========================================================
          TOP SUMMARY
      ========================================================= */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Order status
          </p>

          <div className="mt-3">
            <AdminStatusBadge
              status={String(order.order_status)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Payment status
          </p>

          <div className="mt-3">
            <AdminStatusBadge
              status={effectivePaymentStatus}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Payment method
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900">
            {formatLabel(order.payment_method)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Order total
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(order.total)}
          </p>
        </div>
      </section>

      {/* =========================================================
          ATTENTION BANNER
      ========================================================= */}
      {order.order_status === 'placed' &&
      order.payment_method === 'cod' ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-amber-900">
                Customer confirmation required
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                This COD order has been placed but has not yet been
                confirmed by staff. Contact the customer before
                confirming the order.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {mobile ? (
                <a
                  href={`tel:${mobile}`}
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Call Customer
                </a>
              ) : null}

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* =========================================================
          CUSTOMER + DELIVERY ADDRESS
      ========================================================= */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Customer */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-1">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Customer
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Name
              </p>

              {order.customer_id ? (
                <Link
                  href={`/admin/users/${order.customer_id}`}
                  className="mt-1 inline-flex min-h-[44px] items-center rounded-lg text-left font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 transition hover:text-red-600 hover:decoration-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={`View customer profile for ${customerName}`}
                >
                  {customerName}
                </Link>
              ) : (
                <p className="mt-1 font-semibold text-slate-900">
                  {customerName}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Mobile
              </p>

              {mobile ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <a
                    href={`tel:${mobile}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {mobile}
                  </a>

                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-slate-500">
                  Not available
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Email
              </p>

              <p className="mt-1 break-all text-sm text-slate-700">
                {displayText(email)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">
                Customer ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {displayText(order.customer_id)}
              </p>
            </div>
          </div>
        </section>

        {/* Delivery address */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Delivery Address
            </h2>
          </div>

          <div className="p-5">
            {address ? (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-400">
                    Recipient
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {displayText(address.recipient_name)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-400">
                    Address
                  </p>

                  <p className="mt-1 leading-6 text-slate-700">
                    {displayText(address.formatted_address)}
                  </p>

                  {!address.formatted_address ? (
                    <p className="mt-1 leading-6 text-slate-700">
                      {displayText(address.address_line)}
                      {address.address_line_2
                        ? `, ${address.address_line_2}`
                        : ''}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Village / City
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {displayText(address.village_city)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    Taluka
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {displayText(address.taluka)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    District
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {displayText(address.district)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400">
                    PIN Code
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {displayText(address.pin_code)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-400">
                    Landmark
                  </p>

                  <p className="mt-1 text-sm text-slate-700">
                    {displayText(address.landmark)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-slate-400">
                    Delivery instructions
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {displayText(address.delivery_instructions)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No delivery address is available for this order.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* =========================================================
          PRODUCTS
      ========================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Order Items
              </h2>

              <p className="text-sm text-slate-500">
                {items.length} product
                {items.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>

        {items.length > 0 ? (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Product
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quantity
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unit Price
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tax
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const product = Array.isArray(item.products)
                      ? item.products[0]
                      : item.products;

                    return (
                      <tr key={item.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {displayText(product?.name)}
                          </p>

                          {product?.name_marathi ? (
                            <p className="mt-0.5 text-xs text-slate-500">
                              {product.name_marathi}
                            </p>
                          ) : null}

                          {product?.net_quantity ||
                          product?.unit ? (
                            <p className="mt-1 text-xs text-slate-400">
                              {product?.net_quantity
                                ? `${product.net_quantity} `
                                : ''}
                              {displayText(product?.unit)}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-medium text-slate-700">
                          {item.quantity}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-700">
                          {formatMoney(item.unit_price)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-500">
                          {formatMoney(item.tax)}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-bold text-slate-900">
                          {formatMoney(item.total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((item) => {
                const product = Array.isArray(item.products)
                  ? item.products[0]
                  : item.products;

                return (
                  <div
                    key={item.id}
                    className="space-y-3 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {displayText(product?.name)}
                        </p>

                        {product?.name_marathi ? (
                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.name_marathi}
                          </p>
                        ) : null}
                      </div>

                      <p className="shrink-0 font-bold text-slate-900">
                        {formatMoney(item.total)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-slate-400">
                          Quantity
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {item.quantity}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Unit price
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {formatMoney(item.unit_price)}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">
                          Tax
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {formatMoney(item.tax)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-slate-500">
            No order items were found.
          </div>
        )}
      </section>

      {/* =========================================================
          TOTALS + PAYMENT
      ========================================================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order summary */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Order Summary
            </h2>
          </div>

          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-medium text-slate-800">
                {formatMoney(order.subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Discount
              </span>

              <span className="font-medium text-slate-800">
                -{formatMoney(order.discount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Tax
              </span>

              <span className="font-medium text-slate-800">
                {formatMoney(order.tax)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Delivery fee
              </span>

              <span className="font-medium text-slate-800">
                {formatMoney(order.delivery_fee)}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="font-bold text-slate-900">
                  Total
                </span>

                <span className="text-2xl font-bold text-slate-900">
                  {formatMoney(order.total)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Payment
            </h2>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Method
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {formatLabel(order.payment_method)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">
                Order payment status
              </span>

              <AdminStatusBadge
                status={effectivePaymentStatus}
              />
            </div>

            {payment ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Payment record
                  </span>

                  <AdminStatusBadge
                    status={String(payment.status)}
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-500">
                    Amount
                  </span>

                  <span className="text-sm font-semibold text-slate-900">
                    {formatMoney(payment.amount)}
                  </span>
                </div>

                {payment.transaction_id ? (
                  <div>
                    <p className="text-xs text-slate-400">
                      Transaction ID
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-slate-600">
                      {payment.transaction_id}
                    </p>
                  </div>
                ) : null}

                {payment.provider_reference ? (
                  <div>
                    <p className="text-xs text-slate-400">
                      Provider reference
                    </p>

                    <p className="mt-1 break-all font-mono text-xs text-slate-600">
                      {payment.provider_reference}
                    </p>
                  </div>
                ) : null}

                {payment.paid_at ? (
                  <div>
                    <p className="text-xs text-slate-400">
                      Paid at
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                      {formatDateTime(payment.paid_at)}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No payment record is available.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* =========================================================
          DELIVERY
      ========================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Delivery
          </h2>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Delivery date
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {formatDate(order.delivery_date)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Delivery slot
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              {displayText(order.delivery_slot)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Delivery status
            </p>

            <div className="mt-2">
              <AdminStatusBadge
                status={String(order.delivery_status)}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Delivery partner
            </p>

            <p className="mt-1 break-all font-mono text-xs text-slate-600">
              {displayText(order.delivery_partner_id)}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          ORDER INFORMATION
      ========================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Order Information
          </h2>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-medium text-slate-400">
              Order number
            </p>

            <p className="mt-1 font-mono text-sm font-semibold text-slate-800">
              {order.order_number}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Created
            </p>

            <p className="mt-1 text-sm text-slate-700">
              {formatDateTime(order.created_at)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Last updated
            </p>

            <p className="mt-1 text-sm text-slate-700">
              {formatDateTime(order.updated_at)}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400">
              Order ID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-slate-500">
              {order.id}
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          ADMIN STAGE CONTROL
      ========================================================= */}
      <AdminOrderStageManager
        orderId={order.id}
        orderStatus={String(order.order_status)}
        paymentStatus={effectivePaymentStatus}
        deliveryStatus={String(order.delivery_status)}
      />

      {/* =========================================================
          ACTIONS
      ========================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Order Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage the order only when its current status allows
            the action.
          </p>
        </div>

        <div className="p-5">
          <AdminOrderActions
            orderId={order.id}
            orderNumber={order.order_number}
            customerName={customerName}
            mobile={mobile}
            orderStatus={String(order.order_status)}
            paymentStatus={effectivePaymentStatus}
            paymentMethod={String(order.payment_method)}
          />

          {!canConfirm && !canCancel ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No administrative status actions are currently
              available for this order.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}