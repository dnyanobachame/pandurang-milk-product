import { StaticPage } from '@/components/StaticPage';

export const metadata = { title: 'Refund Policy | Mauli Milk and Products' };

export default function RefundPolicyPage() {
  return (
    <StaticPage title="Refund Policy">
      <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
        Draft template — confirm timelines and eligibility rules with the business before
        publishing.
      </p>
      <h2 className="text-lg font-medium">Payment not verified</h2>
      <p>
        If you submitted a UPI payment that hasn&apos;t been verified, your order stays in
        &quot;Payment Submitted / Verification Pending&quot; — it is never marked paid
        automatically. Contact Support with your order number if this takes longer than a
        few hours.
      </p>
      <h2 className="text-lg font-medium">Damaged or incorrect product</h2>
      <p>
        Report an issue through Support within 24 hours of delivery, with a photo if possible.
        Approved refunds are processed to your original payment method, or adjusted against
        your next Cash on Delivery order.
      </p>
      <h2 className="text-lg font-medium">Cancellations</h2>
      <p>
        Orders can be cancelled before they&apos;re packed. Once packing has started, cancellation
        is handled case-by-case through Support.
      </p>
      <h2 className="text-lg font-medium">Refund status</h2>
      <p>
        Track a refund&apos;s status — Requested, Approved, Processing, or Completed — from
        your order detail page.
      </p>
    </StaticPage>
  );
}
