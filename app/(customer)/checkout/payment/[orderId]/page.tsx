import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { PaymentClaimButton } from './PaymentClaimButton';

export default async function PaymentPage({ params }: { params: { orderId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?redirectTo=/checkout/payment/${params.orderId}`);

  const [{ data: order }, { data: settings }, { data: payment }] = await Promise.all([
    supabase.from('orders').select('id, order_number, total, customer_id').eq('id', params.orderId).single(),
    supabase.from('company_settings').select('upi_id, qr_payment_enabled').single(),
    supabase.from('payments').select('status').eq('order_id', params.orderId).single(),
  ]);

  if (!order || order.customer_id !== user.id) redirect('/dashboard/orders');

  if (!settings?.qr_payment_enabled || !settings?.upi_id) {
    return (
      <main className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-gray-500">
          UPI payment isn&apos;t configured yet. Please contact us to complete this order,
          or choose Cash on Delivery next time.
        </p>
      </main>
    );
  }

  // Standard UPI deep-link format — most UPI apps recognize this on scan.
  const upiUri = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(
    'Pandurang Milk Product'
  )}&am=${order.total}&cu=INR&tn=${encodeURIComponent(`Order ${order.order_number}`)}`;

  const qrDataUrl = await QRCode.toDataURL(upiUri, { width: 260, margin: 1 });

  const alreadySubmitted = payment?.status === 'payment_submitted' || payment?.status === 'paid';

  return (
    <main className="max-w-md mx-auto px-6 py-10 text-center">
      <h1 className="text-xl font-semibold">Pay ₹{order.total}</h1>
      <p className="text-sm text-gray-500 mb-6">Order #{order.order_number}</p>

      <img src={qrDataUrl} alt="UPI payment QR code" className="mx-auto rounded-xl2 border border-gray-100" />

      <p className="mt-4 text-sm text-gray-600">
        UPI ID: <span className="font-mono">{settings.upi_id}</span>
      </p>

      {payment?.status === 'paid' ? (
        <p className="mt-6 text-brand-700 font-medium">Payment verified ✓</p>
      ) : alreadySubmitted ? (
        <div className="mt-6 rounded-xl2 bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          Payment Submitted / Verification Pending — we&apos;ll confirm your order shortly.
        </div>
      ) : (
        <PaymentClaimButton orderId={order.id} />
      )}

      <a href="/dashboard/orders" className="block mt-6 text-sm text-brand-700">
        View order status →
      </a>
    </main>
  );
}
