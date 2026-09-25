import { StaticPage } from '@/components/StaticPage';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'About | Mauli Milk and Products' };

export default async function AboutPage() {
  const supabase = createClient();
  const { data: settings } = await supabase.from('company_settings').select('company_name, tagline, address').single();

  return (
    <StaticPage title={`About ${settings?.company_name ?? 'Mauli Milk and Products'}`}>
      <p>
        {settings?.company_name ?? 'Mauli Milk and Products'} collects, processes, and delivers
        milk and dairy products across {settings?.address ?? 'Latur District, Maharashtra'}.
        Every batch is tracked from collection through delivery, with a quality check at each
        stage of the process.
      </p>
      <p>
        We work directly with local farmers and suppliers, and deliver on a daily and
        subscription basis to households across our service area.
      </p>
      <p className="text-sm text-gray-500 border-t border-gray-100 pt-4 mt-6">
        This page is placeholder copy for Admin to edit with the business&apos;s real story,
        photos, and any certifications before launch — see spec §4 (do not present unverified
        claims such as &quot;100% pure&quot; without supporting evidence).
      </p>
    </StaticPage>
  );
}
