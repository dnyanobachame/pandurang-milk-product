import { StaticPage } from '@/components/StaticPage';
import { createClient } from '@/lib/supabase/server';
import { buildWhatsAppUrl, WHATSAPP_GENERAL_MESSAGE } from '@/lib/whatsapp-link';
import { getInstagramUrl } from '@/lib/social';

export const metadata = { title: 'Contact | Pandurang Milk Product' };

export default async function ContactPage() {
  const supabase = createClient();
  const [{ data: settings }, { data: areas }] = await Promise.all([
    supabase.from('company_settings').select('company_name, phone, email, address').single(),
    supabase.from('delivery_areas').select('city_or_village').eq('is_active', true).order('city_or_village'),
  ]);

  const whatsappUrl = buildWhatsAppUrl(WHATSAPP_GENERAL_MESSAGE);
  const instagramUrl = getInstagramUrl();

  return (
    <StaticPage title="Contact Us">
      <p>{settings?.company_name ?? 'Pandurang Milk Product'}</p>
      <p>{settings?.address ?? 'Latur District, Maharashtra'}</p>
      <p>📞 Phone: {settings?.phone || 'Not yet configured by Admin'}</p>
      <p>✉️ Email: {settings?.email || 'Not yet configured by Admin'}</p>

      <h2 className="text-lg font-medium mt-6">Chat With Us</h2>
      <p className="text-sm text-gray-600">
        Questions about products, prices, daily availability, delivery areas, bulk orders,
        subscriptions, complaints, or anything else.
      </p>
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 rounded-full bg-[#25D366] text-white text-sm font-medium px-5 py-2"
        >
          💬 Chat on WhatsApp
        </a>
      ) : (
        <p className="text-xs text-gray-400 mt-2">WhatsApp contact is not yet configured.</p>
      )}

      {instagramUrl && (
        <>
          <h2 className="text-lg font-medium mt-6">Follow Us</h2>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-brand-700 font-medium"
          >
            📸 Follow Pandurang Milk Product on Instagram →
          </a>
        </>
      )}

      <h2 className="text-lg font-medium mt-6">Delivery Areas</h2>
      <p>
        {(areas ?? []).map((a) => a.city_or_village).join(', ') ||
          'Delivery areas will be listed here once Admin configures them.'}
      </p>
    </StaticPage>
  );
}
