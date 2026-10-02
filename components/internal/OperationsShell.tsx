
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Boxes,
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Truck,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { roleLabel } from '@/lib/role-labels';
import type { AppRole } from '@/lib/roles';

type OperationsShellProps = {
  children: React.ReactNode;
  userName: string;
  userRole: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

function contextForRole(role: string) {
  switch (role) {
    case 'delivery_partner':
      return {
        title: 'Delivery Operations',
        short: 'Delivery',
      };

    case 'packing_manager':
    case 'packing_staff':
      return {
        title: 'Packing Operations',
        short: 'Packing',
      };

    case 'production_manager':
    case 'production_staff':
      return {
        title: 'Production Operations',
        short: 'Production',
      };

    case 'quality_control':
      return {
        title: 'Quality Control',
        short: 'Quality',
      };

    case 'inventory_manager':
      return {
        title: 'Inventory Operations',
        short: 'Inventory',
      };

    case 'delivery_manager':
      return {
        title: 'Delivery Operations',
        short: 'Delivery',
      };

    default:
      return {
        title: 'Operations',
        short: 'Operations',
      };
  }
}

function navigationForRole(role: string): NavGroup[] {
  const common: NavGroup[] = [];

  if (role === 'delivery_partner') {
    common.push({
      title: 'My Work',
      items: [
        {
          href: '/delivery',
          label: 'My Deliveries',
          icon: <Truck className="h-5 w-5" />,
        },
      ],
    });
  }

  if (role === 'delivery_manager') {
    common.push({
      title: 'Delivery',
      items: [
        {
          href: '/admin/delivery',
          label: 'Delivery Orders',
          icon: <Truck className="h-5 w-5" />,
        },
        {
          href: '/admin/delivery/areas',
          label: 'Delivery Areas',
          icon: <Boxes className="h-5 w-5" />,
        },
      ],
    });
  }

  if (role === 'packing_manager' || role === 'packing_staff') {
    common.push({
      title: 'Fulfilment',
      items: [
        {
          href: '/packing',
          label: 'Packing Queue',
          icon: <PackageCheck className="h-5 w-5" />,
        },
        {
          href: '/admin/production/batches',
          label: 'Production Batches',
          icon: <Boxes className="h-5 w-5" />,
        },
      ],
    });
  }

  if (role === 'production_manager' || role === 'production_staff') {
    common.push({
      title: 'Production',
      items: [
        {
          href: '/admin/production',
          label: 'Production Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          href: '/admin/production/collections',
          label: 'Milk Collections',
          icon: <Factory className="h-5 w-5" />,
        },
        {
          href: '/admin/production/batches',
          label: 'Production Batches',
          icon: <Boxes className="h-5 w-5" />,
        },
        ...(role === 'production_manager'
          ? [
              {
                href: '/admin/production/quality',
                label: 'Quality Control',
                icon: <ClipboardCheck className="h-5 w-5" />,
              },
            ]
          : []),
      ],
    });
  }

  if (role === 'quality_control') {
    common.push({
      title: 'Quality',
      items: [
        {
          href: '/admin/production',
          label: 'Production Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          href: '/admin/production/batches',
          label: 'Production Batches',
          icon: <Boxes className="h-5 w-5" />,
        },
        {
          href: '/admin/production/quality',
          label: 'Quality Control',
          icon: <ClipboardCheck className="h-5 w-5" />,
        },
      ],
    });
  }

  if (role === 'inventory_manager') {
    common.push({
      title: 'Inventory',
      items: [
        {
          href: '/admin/inventory',
          label: 'Inventory Dashboard',
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          href: '/admin/products',
          label: 'Products',
          icon: <Boxes className="h-5 w-5" />,
        },
        {
          href: '/admin/traceability',
          label: 'Batch Traceability',
          icon: <ClipboardCheck className="h-5 w-5" />,
        },
      ],
    });
  }

  return common;
}

function isActive(pathname: string, href: string) {
  if (href === '/delivery' || href === '/packing') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OperationsShell({
  children,
  userName,
  userRole,
}: OperationsShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const role = String(profile?.role ?? userRole);
  const context = contextForRole(role);
  const groups = navigationForRole(role);

  const displayName = profile?.full_name || userName || 'Staff';

  const initial =
    displayName.trim().charAt(0).toUpperCase() || 'S';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function logout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut();
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      setLoggingOut(false);
    }
  }

  const homeHref =
    role === 'delivery_partner'
      ? '/delivery'
      : role.startsWith('packing_')
        ? '/packing'
        : '/admin/production';

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      {/* Mobile backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}
      <aside
        aria-label={`${context.title} sidebar`}
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex min-h-[76px] items-center border-b border-slate-200 px-5">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600 text-xl text-white shadow-sm"
            >
              🥛
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-950">
                Pandurang Milk Product
              </p>

              <p className="truncate text-[11px] font-medium text-slate-500">
                {context.title}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User */}
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700"
            >
              {initial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">
                {displayName}
              </p>

              <p className="truncate text-xs text-slate-500">
                {roleLabel(role as AppRole)}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label={`${context.title} navigation`}
          className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          {groups.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No navigation items available.
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.title} className="mb-6">
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {group.title}
                </p>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                          active
                            ? 'bg-red-50 text-red-800'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-50 text-slate-500'
                          }`}
                        >
                          {item.icon}
                        </span>

                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg"
            >
              ↗
            </span>

            View Storefront
          </Link>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="mt-1 flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50"
            >
              <LogOut className="h-4 w-4" />
            </span>

            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
          ===================================================== */}
      <div className="min-h-screen lg:pl-[280px]">
        {/* FIXED OPERATIONS HEADER */}
        <div className="fixed inset-x-0 top-0 z-50 lg:left-[280px]">
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
            <div className="flex min-h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Open navigation"
                aria-expanded={open}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Page context */}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">
                  Pandurang Milk Product
                </div>

                <div className="truncate text-base font-bold text-slate-900 sm:text-lg">
                  {context.title}
                </div>
              </div>

              {/* User */}
              <div className="hidden items-center gap-3 sm:flex">
                <div className="text-right">
                  <p className="max-w-[180px] truncate text-sm font-bold text-slate-900">
                    {displayName}
                  </p>

                  <p className="text-xs text-slate-500">
                    {roleLabel(role as AppRole)}
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white"
                >
                  {initial}
                </div>
              </div>
            </div>
          </header>
        </div>

        {/* Page content */}
        <main className="min-w-0 overflow-x-hidden px-4 pb-5 pt-[92px] sm:px-6 sm:pb-7 sm:pt-[96px] lg:px-8 lg:pb-8 lg:pt-[100px]">
          <div className="mx-auto w-full max-w-[1440px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
