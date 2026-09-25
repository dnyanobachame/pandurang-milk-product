import { StaticPage } from '@/components/StaticPage';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Shipping & Delivery Policy | Mauli Milk and Products' };

export default async function ShippingPolicyPage() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('company_settings')
    .select('default_delivery_fee, free_delivery_above')
    .single();

  return (
    <StaticPage title="Shipping &amp; Delivery Policy">
      <h2 className="text-lg font-medium">Delivery areas</h2>
      <p>
        We currently deliver to the villages and cities listed on our{' '}
        <a href="/contact" className="text-brand-700">Contact page</a>. Delivery to a new
        area is enabled by Admin before it can be selected at checkout.
      </p>
      <h2 className="text-lg font-medium">Delivery fees</h2>
      <p>
        {settings?.free_delivery_above
          ? `Orders above ₹${settings.free_delivery_above} qualify for free delivery. `
          : ''}
        {settings?.default_delivery_fee
          ? `Otherwise, a delivery fee of ₹${settings.default_delivery_fee} applies (some areas may have a different fee — shown at checkout).`
          : 'Delivery fees are shown at checkout based on your address.'}
      </p>
      <h2 className="text-lg font-medium">Delivery confirmation</h2>
      <p>
        Our delivery partner confirms every delivery with a one-time code shared with you —
        please have it ready when your order arrives.
      </p>
      <h2 className="text-lg font-medium">Subscriptions</h2>
      <p>
        Daily/recurring subscription deliveries run automatically based on the schedule you
        set — pause anytime from your account before the next cutoff.
      </p>
    </StaticPage>
  );
}
