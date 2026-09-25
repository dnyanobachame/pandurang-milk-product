import { StaticPage } from '@/components/StaticPage';

export const metadata = { title: 'Terms & Conditions | Mauli Milk and Products' };

export default function TermsPage() {
  return (
    <StaticPage title="Terms &amp; Conditions">
      <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
        Draft template — have this reviewed by a lawyer familiar with Indian consumer and
        e-commerce law before publishing.
      </p>
      <h2 className="text-lg font-medium">1. Orders</h2>
      <p>
        By placing an order, you confirm the delivery address and contact details you provide
        are accurate. We reserve the right to cancel an order if a product becomes unavailable
        or delivery to your location isn&apos;t currently supported.
      </p>
      <h2 className="text-lg font-medium">2. Pricing</h2>
      <p>
        Prices shown at checkout are final at the time of order placement. Prices may change
        for future orders without notice.
      </p>
      <h2 className="text-lg font-medium">3. Payments</h2>
      <p>
        We accept UPI and, where enabled, Cash on Delivery. A UPI payment is confirmed only
        after verification — see our Refund Policy for what happens if a payment cannot be
        verified.
      </p>
      <h2 className="text-lg font-medium">4. Subscriptions</h2>
      <p>
        Recurring subscriptions can be paused, changed, or cancelled at any time from your
        account before the next scheduled delivery cutoff.
      </p>
      <h2 className="text-lg font-medium">5. Liability</h2>
      <p>
        Perishable products should be inspected on delivery. Report any issue with a delivered
        product within 24 hours through Support so we can investigate.
      </p>
    </StaticPage>
  );
}
