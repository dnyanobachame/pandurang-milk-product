
'use client';

import { usePathname } from 'next/navigation';

import { Header } from '@/components/Header';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { WhatsAppFloatingButton } from '@/components/WhatsAppFloatingButton';

export function RouteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  /*
   * Admin pages use their own professional
   * admin header/sidebar.
   *
   * Internal operations pages such as Delivery
   * and Packing also use their own OperationsShell.
   *
   * The public website chrome must never appear
   * above internal/admin operations screens.
   */
  const isAdminRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/');

  const isOperationsRoute =
    pathname === '/delivery' ||
    pathname === '/packing';

  if (isAdminRoute || isOperationsRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />

      <main className="min-w-0 pb-16 md:pb-0">
        {children}
      </main>

      <MobileBottomNav />

      <WhatsAppFloatingButton />
    </>
  );
}
