import { StaticPage } from '@/components/StaticPage';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Contact | Mauli Milk and Products' };

export default async function ContactPage() {
  const supabase = createClient();
  const [{ data: settings }, { data: areas }] = await Promise.all([
    supabase.from('company_settings').select('company_name, phone, email, address').single(),
    supabase.from('delivery_areas').select('city_or_village').eq('is_active', true).order('city_or_village'),
  ]);

  return (
    <StaticPage title="Contact Us">
      <p>{settings?.company_name ?? 'Mauli Milk and Products'}</p>
      <p>{settings?.address ?? 'Latur District, Maharashtra'}</p>
      <p>Phone: {settings?.phone || 'Not yet configured by Admin'}</p>
      <p>Email: {settings?.email || 'Not yet configured by Admin'}</p>

      <h2 className="text-lg font-medium mt-6">Delivery Areas</h2>
      <p>
        {(areas ?? []).map((a) => a.city_or_village).join(', ') || 'Delivery areas will be listed here once Admin configures them.'}
      </p>
    </StaticPage>
  );
}
