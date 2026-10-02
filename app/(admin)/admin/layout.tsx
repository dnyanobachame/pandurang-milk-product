import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: {
    default: 'Admin Console',
    template: '%s | Pandurang Milk Product Admin',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /*
   * Admin pages must always require authentication.
   */
  if (!user) {
    redirect('/auth/login?redirectTo=/admin/dashboard');
  }

  /*
   * Load the authenticated user's profile.
   */
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      is_active
    `)
    .eq('id', user.id)
    .single();

  /*
   * Deactivated users must not access the admin console.
   */
  if (!profile?.is_active) {
    redirect('/auth/deactivated');
  }

  const userName =
    profile.full_name ||
    user.email?.split('@')[0] ||
    'Staff';

  const userRole = String(
    profile.role ?? 'staff'
  );

  return (
    <AdminShell
      userName={userName}
      userRole={userRole}
    >
      {children}
    </AdminShell>
  );
}