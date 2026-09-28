import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AddressManager } from '@/components/AddressManager';
import type { SavedAddress } from '@/lib/address-schema';

export const metadata = { title: 'My Addresses | Pandurang Milk Product' };

export default async function AddressesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/dashboard/addresses');

  const { data } = await supabase
    .from('customer_addresses')
    .select(
      'id, label, recipient_name, phone, address_line, address_line_2, landmark, village_city, taluka, district, state, pin_code, delivery_instructions, is_default'
    )
    .eq('customer_id', user.id)
    // default first, then newest
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <AddressManager addresses={(data ?? []) as SavedAddress[]} />
    </main>
  );
}
