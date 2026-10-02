
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import AdminHeader from '@/components/admin/AdminHeader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { AdminBackButton } from '@/components/admin/AdminBackButton';

type AdminShellProps = {
  children: React.ReactNode;
  userName: string;
  userRole: string;
};

export function AdminShell({
  children,
  userName,
  userRole,
}: AdminShellProps) {
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const showBackButton =
    pathname !== '/admin' &&
    pathname !== '/admin/dashboard';

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* ADMIN NAVIGATION */}
      <AdminSidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* MAIN APPLICATION AREA */}
      <div className="min-h-screen min-w-0 lg:pl-[280px]">
        {/* FIXED ADMIN HEADER */}
        <div className="fixed inset-x-0 top-0 z-50 lg:left-[280px]">
          <AdminHeader
            userName={userName}
            userRole={userRole}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        {/* CONTENT AREA
            Reserve the 72px header height so content
            never sits underneath the fixed header. */}
        <main
          id="admin-main-content"
          className="min-w-0 overflow-x-hidden px-3 pb-4 pt-[88px] sm:px-6 sm:pb-6 sm:pt-[96px] lg:px-8 lg:pb-7 lg:pt-[100px]"
        >
          <div className="mx-auto w-full max-w-[1440px] min-w-0">
            {showBackButton ? (
              <div className="mb-4 sm:mb-5">
                <AdminBackButton />
              </div>
            ) : null}

            <div className="min-w-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
