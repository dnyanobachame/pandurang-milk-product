
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { PaymentClaimButton } from './PaymentClaimButton';

export default async function PaymentPage({
  params,
}: {
  params: { orderId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/login?redirectTo=/checkout/payment/${params.orderId}`,
    );
  }

  const [
    { data: order },
    { data: settings },
    { data: payment },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, total, customer_id')
      .eq('id', params.orderId)
      .single(),

    supabase
      .from('company_settings')
      .select('upi_id, qr_payment_enabled')
      .single(),

    supabase
      .from('payments')
      .select('status')
      .eq('order_id', params.orderId)
      .single(),
  ]);

  if (!order || order.customer_id !== user.id) {
    redirect('/dashboard/orders');
  }

  if (!settings?.qr_payment_enabled || !settings?.upi_id) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-8 sm:px-5 sm:py-12">
        <div className="mx-auto max-w-md">
          <section className="rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-xl"
              aria-hidden="true"
            >
              ₹
            </div>

            <h1 className="mt-5 text-lg font-bold text-slate-900">
              UPI payment unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              UPI payment isn&apos;t configured yet. Please contact us to
              complete this order, or choose Cash on Delivery next time.
            </p>

            <a
              href="/dashboard/orders"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              View My Orders
            </a>
          </section>
        </div>
      </main>
    );
  }

  // Standard UPI deep-link format — most UPI apps recognize this on scan.
  const upiUri = `upi://pay?pa=${encodeURIComponent(
    settings.upi_id,
  )}&pn=${encodeURIComponent(
    'Pandurang Milk Product',
  )}&am=${order.total}&cu=INR&tn=${encodeURIComponent(
    `Order ${order.order_number}`,
  )}`;

  const qrDataUrl = await QRCode.toDataURL(upiUri, {
    width: 260,
    margin: 1,
  });

  const alreadySubmitted =
    payment?.status === 'payment_submitted' ||
    payment?.status === 'paid';

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-8 pt-4 sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-md">

        {/* -------------------------------------------------------------- */}
        {/* PAYMENT HEADER                                                  */}
        {/* -------------------------------------------------------------- */}

        <div className="mb-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">
            Secure Payment
          </p>

          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pay ₹{order.total}
          </h1>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Order #{order.order_number}
          </p>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* QR PAYMENT CARD                                                 */}
        {/* -------------------------------------------------------------- */}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm sm:p-6">
          <div className="flex items-center justify-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-sm"
              aria-hidden="true"
            >
              QR
            </span>

            <h2 className="text-sm font-bold text-slate-900">
              Scan & Pay with UPI
            </h2>
          </div>

          <div className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <img
              src={qrDataUrl}
              alt={`UPI payment QR code for ₹${order.total}`}
              className="h-[260px] w-[260px] max-w-full rounded-xl"
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Open any supported UPI app and scan this QR code to pay.
          </p>

          {/* UPI ID */}
          <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              UPI ID
            </p>

            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
              {settings.upi_id}
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/* PAYMENT STATUS                                                  */}
        {/* -------------------------------------------------------------- */}

        <section className="mt-4">
          {payment?.status === 'paid' ? (
            <div
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center"
              role="status"
            >
              <div
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                aria-hidden="true"
              >
                ✓
              </div>

              <p className="mt-2 text-sm font-bold text-emerald-800">
                Payment verified
              </p>

              <p className="mt-0.5 text-xs text-emerald-700">
                Your payment has been confirmed.
              </p>
            </div>
          ) : alreadySubmitted ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
              role="status"
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-sm"
                  aria-hidden="true"
                >
                  ⏳
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-amber-900">
                    Payment submitted
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Verification is pending. We&apos;ll confirm your
                    payment and update your order shortly.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-center text-xs leading-5 text-slate-500">
                After completing the UPI payment, confirm it below so we
                can verify your order.
              </p>

              <PaymentClaimButton orderId={order.id} />
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------- */}
        {/* ORDER STATUS                                                    */}
        {/* -------------------------------------------------------------- */}

        <a
          href="/dashboard/orders"
          className="mt-4 flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          View Order Status
          <span className="ml-1.5" aria-hidden="true">
            →
          </span>
        </a>

        <p className="px-2 pt-6 text-center text-[10px] text-slate-400">
          Pandurang Milk Product • UPI Payment
        </p>
      </div>
    </main>
  );
}
