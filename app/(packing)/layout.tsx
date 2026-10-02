import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { OperationsShell } from '@/components/internal/OperationsShell';

export const metadata: Metadata = {
  title: 'Packing Operations | Pandurang Milk Product',
  robots: {
    index: false,
    follow: false,
  },
};

const PACKING_ROLES = [
  'admin',
  'packing_manager',
  'packing_staff',
];

export default async function PackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/packing');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (
    !profile?.is_active ||
    !PACKING_ROLES.includes(String(profile.role))
  ) {
    redirect('/auth/login?error=packing_access_denied');
  }

  return (
    <OperationsShell
      userName={
        profile.full_name ||
        user.email?.split('@')[0] ||
        'Staff'
      }
      userRole={String(profile.role)}
    >
      {children}
    </OperationsShell>
  );
}