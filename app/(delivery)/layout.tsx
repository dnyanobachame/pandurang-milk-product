import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { OperationsShell } from '@/components/internal/OperationsShell';

export const metadata: Metadata = {
  title: 'Delivery Operations | Pandurang Milk Product',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/delivery');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active || profile.role !== 'delivery_partner') {
    redirect('/auth/login?error=delivery_access_denied');
  }

  const userName =
    profile.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Partner';

  return (
    <OperationsShell
      userName={userName}
      userRole={String(profile.role)}
    >
      {children}
    </OperationsShell>
  );
}