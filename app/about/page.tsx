import { StaticPage } from '@/components/StaticPage';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'About | Mauli Milk and Products',
};

export default async function AboutPage() {
  const supabase = createClient();

  const { data: settings } = await supabase
    .from('company_settings')
    .select('company_name, tagline, address')
    .single();

  const companyName =
    settings?.company_name ?? 'Mauli Milk and Products';

  const address =
    settings?.address ?? 'Latur District, Maharashtra';

  return (
    <StaticPage title={`About ${companyName}`}>
      <div className="space-y-5">
        {/* Introduction */}
        <section>
          <p className="text-base leading-7 text-gray-700">
            {companyName} collects, processes, and delivers milk and dairy
            products across {address}. Every batch is tracked from collection
            through delivery, with a quality check at each stage of the
            process.
          </p>
        </section>

        {/* Our service */}
        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-base font-bold text-gray-900">
            Our Service
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            We work directly with local farmers and suppliers, and deliver on
            a daily and subscription basis to households across our service
            area.
          </p>
        </section>

        {/* Location */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Service Area
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-900">
            {address}
          </p>

          {settings?.tagline && (
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {settings.tagline}
            </p>
          )}
        </section>

        {/* Admin note */}
        <section className="border-t border-gray-100 pt-5">
          <p className="text-xs leading-5 text-gray-500">
            This page contains placeholder copy for Admin to replace with the
            business&apos;s real story, photos, and any certifications before
            launch. Do not present unverified claims such as &quot;100%
            pure&quot; without supporting evidence.
          </p>
        </section>
      </div>
    </StaticPage>
  );
}