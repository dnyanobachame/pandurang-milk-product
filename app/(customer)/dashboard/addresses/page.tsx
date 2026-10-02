import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddressManager } from '@/components/AddressManager';
import type { SavedAddress } from '@/lib/address-schema';

export const metadata = {
  title: 'My Addresses | Pandurang Milk Product',
};

export default async function AddressesPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/addresses');
  }

  const { data } = await supabase
    .from('customer_addresses')
    .select(
      'id, label, recipient_name, phone, address_line, address_line_2, landmark, village_city, taluka, district, state, pin_code, delivery_instructions, is_default'
    )
    .eq('customer_id', user.id)
    // Default address first, then newest
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Page header */}
        <div className="mb-5">
          <div className="mb-3">
            <a
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <span aria-hidden="true">←</span>
              Dashboard
            </a>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Account
                </p>

                <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  My Addresses
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Manage your saved delivery addresses.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-700">
                📍
              </div>
            </div>
          </div>
        </div>

        {/* Address manager */}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <AddressManager
            addresses={(data ?? []) as SavedAddress[]}
          />
        </section>
      </div>
    </main>
  );
}