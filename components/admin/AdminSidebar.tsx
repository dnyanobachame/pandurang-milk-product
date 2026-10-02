'use client';

import Link from 'next/link';
import {
  usePathname,
  useSearchParams,
  useRouter,
} from 'next/navigation';

import { useAuth } from '@/lib/auth-context';
import { roleLabel } from '@/lib/role-labels';
import {
  canAccess,
  type AppRole,
} from '@/lib/roles';

type AdminSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;

  /*
   * Kept for compatibility/documentation.
   *
   * Actual sidebar authorization is handled by canAccess()
   * from lib/roles.ts so the UI follows the same permission
   * matrix as middleware.ts.
   */
  roles: AppRole[];
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

/**
 * Sidebar navigation.
 *
 * IMPORTANT:
 * Do not treat this as the security boundary.
 *
 * middleware.ts + server actions + Supabase RLS
 * remain responsible for actual authorization.
 *
 * The sidebar simply hides routes that the current role
 * does not need to see.
 */
const NAVIGATION: NavGroup[] = [
  // ============================================================
  // OVERVIEW
  // ============================================================

  {
    title: 'Overview',
    items: [
      {
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        roles: [
          'admin',
          'sales_manager',
          'accountant',
          'customer_support',
        ],
      },
    ],
  },

  // ============================================================
  // SALES
  // ============================================================

  {
    title: 'Sales',
    items: [
      {
        href: '/admin/orders',
        label: 'Orders',
        icon: 'orders',
        roles: [
          'admin',
          'sales_manager',
          'customer_support',
          'accountant',
        ],
      },

      {
        href: '/admin/orders?filter=today',
        label: "Today's Orders",
        icon: 'today',
        roles: [
          'admin',
          'sales_manager',
          'customer_support',
          'accountant',
        ],
      },

      {
        href: '/admin/orders?filter=pending_confirmation',
        label: 'Pending Confirmation',
        icon: 'pending',
        roles: [
          'admin',
          'sales_manager',
          'customer_support',
          'accountant',
        ],
      },

      {
        href: '/admin/orders?filter=payment_review',
        label: 'Payment Verification',
        icon: 'payment',
        roles: [
          'admin',
          'sales_manager',
          'accountant',
        ],
      },

      {
        href: '/admin/reports?report=revenue',
        label: 'Revenue',
        icon: 'revenue',
        roles: [
          'admin',
          'sales_manager',
          'accountant',
        ],
      },
    ],
  },

  // ============================================================
  // CATALOG
  // ============================================================

  {
    title: 'Catalog',
    items: [
      {
        href: '/admin/products',
        label: 'Products',
        icon: 'products',
        roles: [
          'admin',
          'sales_manager',
          'inventory_manager',
        ],
      },

      {
        href: '/admin/products/today',
        label: "Today's Products",
        icon: 'today',
        roles: [
          'admin',
          'sales_manager',
        ],
      },
    ],
  },

  // ============================================================
  // PROCUREMENT
  // ============================================================

  {
    title: 'Procurement',
    items: [
      {
        href: '/admin/suppliers',
        label: 'Suppliers / Farmers',
        icon: 'supplier',
        roles: [
          'admin',
          'production_manager',
          'accountant',
        ],
      },

      {
        href: '/admin/production/collections',
        label: 'Milk Collections',
        icon: 'milk',
        roles: [
          'admin',
          'production_manager',
          'production_staff',
        ],
      },
    ],
  },

  // ============================================================
  // PRODUCTION
  // ============================================================

  {
    title: 'Production',
    items: [
      {
        href: '/admin/production/batches',
        label: 'Production Batches',
        icon: 'batch',
        roles: [
          'admin',
          'production_manager',
          'production_staff',
          'quality_control',
          'packing_manager',
          'packing_staff',
        ],
      },

      {
        href: '/admin/production/quality',
        label: 'Quality Control',
        icon: 'quality',
        roles: [
          'admin',
          'production_manager',
          'quality_control',
        ],
      },

      {
        href: '/admin/production/rate-chart',
        label: 'Milk Rate Chart',
        icon: 'revenue',
        roles: [
          'admin',
          'production_manager',
        ],
      },
    ],
  },

  // ============================================================
  // FULFILMENT
  // ============================================================

  {
    title: 'Fulfilment',
    items: [
      {
        href: '/admin/packing',
        label: 'Packing',
        icon: 'packing',
        roles: [
          'admin',
          'packing_manager',
          'packing_staff',
        ],
      },

      {
        href: '/admin/inventory',
        label: 'Inventory',
        icon: 'inventory',
        roles: [
          'admin',
          'inventory_manager',
        ],
      },

      {
        href: '/admin/traceability',
        label: 'Batch Traceability',
        icon: 'traceability',
        roles: [
          'admin',
          'production_manager',
          'quality_control',
          'inventory_manager',
          'sales_manager',
          'customer_support',
        ],
      },
    ],
  },

  // ============================================================
  // DELIVERY
  // ============================================================

  {
    title: 'Delivery',
    items: [
      {
        href: '/admin/delivery',
        label: 'Delivery Orders',
        icon: 'truck',
        roles: [
          'admin',
          'delivery_manager',
        ],
      },

      {
        href: '/delivery',
        label: 'My Deliveries',
        icon: 'truck',
        roles: [
          'delivery_partner',
        ],
      },

      {
        href: '/admin/delivery/areas',
        label: 'Delivery Areas',
        icon: 'location',
        roles: [
          'admin',
          'delivery_manager',
        ],
      },
    ],
  },

  // ============================================================
  // FINANCE
  // ============================================================

  {
    title: 'Finance',
    items: [
      {
        href: '/admin/expenses',
        label: 'Expenses',
        icon: 'expenses',
        roles: [
          'admin',
          'accountant',
        ],
      },

      {
        href: '/admin/reports',
        label: 'Reports',
        icon: 'reports',
        roles: [
          'admin',
          'accountant',
          'sales_manager',
        ],
      },
    ],
  },

  // ============================================================
  // COMMUNICATION
  // ============================================================

  {
    title: 'Communication',
    items: [
      {
        href: '/admin/whatsapp',
        label: 'WhatsApp',
        icon: 'whatsapp',
        roles: [
          'admin',
          'sales_manager',
          'customer_support',
        ],
      },

      {
        href: '/admin/support',
        label: 'Support',
        icon: 'support',
        roles: [
          'admin',
          'customer_support',
          'sales_manager',
        ],
      },
    ],
  },

  // ============================================================
  // MANAGEMENT
  // ============================================================

  {
    title: 'Management',
    items: [
      {
        href: '/admin/users',
        label: 'Staff & Users',
        icon: 'users',
        roles: [
          'admin',
        ],
      },

      {
        href: '/admin/settings',
        label: 'Settings',
        icon: 'settings',
        roles: [
          'admin',
        ],
      },
    ],
  },
];

function Icon({
  name,
}: {
  name: string;
}) {
  const common = 'h-[18px] w-[18px]';

  switch (name) {
    case 'dashboard':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </svg>
      );

    case 'orders':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case 'products':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
          <path d="m4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5" />
        </svg>
      );

    case 'today':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'pending':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'payment':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
          />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );

    case 'revenue':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );

    case 'milk':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M8 3h8l1 4v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7l1-4Z" />
          <path d="M8 7h8M9 12h6" />
        </svg>
      );

    case 'supplier':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c.5-3.4 2.3-5.5 5.5-5.5s5 2.1 5.5 5.5" />
          <path d="M16 11.5a2.5 2.5 0 1 0 0-5" />
          <path d="M16 14.5c2.4.2 4 2 4.5 4.5" />
        </svg>
      );

    case 'batch':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
          <path d="M7 3v18M17 3v18" />
        </svg>
      );

    case 'quality':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
          <path d="m8.5 12 2.3 2.3 4.7-5" />
        </svg>
      );

    case 'packing':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="m4 7 8-4 8 4-8 4-8-4Z" />
          <path d="M4 7v10l8 4 8-4V7M12 11v10" />
        </svg>
      );

    case 'inventory':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 6h16v14H4z" />
          <path d="M8 6V4h8v2M8 10h8M8 14h5" />
        </svg>
      );

    case 'traceability':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="19" cy="6" r="2.5" />
          <circle cx="19" cy="18" r="2.5" />
          <path d="m7.3 11 9.4-4M7.3 13l9.4 4" />
        </svg>
      );

    case 'truck':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
          <circle cx="7" cy="19" r="2" />
          <circle cx="18" cy="19" r="2" />
        </svg>
      );

    case 'location':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );

    case 'expenses':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );

    case 'reports':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );

    case 'users':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11c2.2 0 4 1.8 4 4M17 5.5a2.5 2.5 0 1 1 0 5" />
        </svg>
      );

    case 'settings':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.1v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.1h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5-1.5.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.1v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V13h-.2a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z" />
          <path d="M9 8.5c.3 2 1.5 3.5 3.5 4.5.7.3 1.3.4 1.8-.2l.6-.7" />
        </svg>
      );

    case 'support':
      return (
        <svg
          className={common}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M4 12a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-6h4" />
          <path d="M4 13H2v4a2 2 0 0 0 2 2h2v-6" />
          <path d="M9 19h3" />
        </svg>
      );

    default:
      return (
        <span
          aria-hidden="true"
          className="h-[18px] w-[18px]"
        />
      );
  }
}

function isActive(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
) {
  const [hrefPath, hrefQuery] =
    href.split('?');

  /*
   * Dashboard:
   * /admin and /admin/dashboard both resolve
   * to the dashboard.
   */
  if (
    hrefPath === '/admin/dashboard' ||
    hrefPath === '/admin'
  ) {
    return (
      pathname === '/admin' ||
      pathname === '/admin/dashboard'
    );
  }

  /*
   * Query-specific navigation.
   *
   * Example:
   * /admin/orders?filter=today
   */
  if (hrefQuery) {
    const targetParams =
      new URLSearchParams(hrefQuery);

    if (pathname !== hrefPath) {
      return false;
    }

    let matches = true;

    targetParams.forEach(
      (value, key) => {
        if (searchParams.get(key) !== value) {
          matches = false;
        }
      },
    );

    return matches;
  }

  /*
   * Normal route.
   */
  return (
    pathname === hrefPath ||
    pathname.startsWith(`${hrefPath}/`)
  );
}

export default function AdminSidebar({
  mobileOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { profile, signOut } = useAuth();

  const role = String(
    profile?.role ?? '',
  );

  /*
   * Convert the profile role into the central AppRole type.
   */
  const appRole = role as AppRole;

  /*
   * Build the visible navigation from the SAME permission
   * source used by middleware.ts.
   *
   * This prevents the sidebar and direct URL authorization
   * from drifting apart.
   */
  const groups = NAVIGATION
    .map((group) => ({
      ...group,

      items: group.items.filter((item) => {
        /*
         * Remove query parameters before authorization.
         *
         * Example:
         * /admin/orders?filter=today
         *
         * becomes:
         * /admin/orders
         */
        const pathnameOnly =
          item.href.split('?')[0];

        return canAccess(
          pathnameOnly,
          appRole,
        );
      }),
    }))
    .filter(
      (group) => group.items.length > 0,
    );

  async function handleLogout() {
    onClose();

    await signOut();

    router.push('/');
    router.refresh();
  }

  const displayName =
    profile?.full_name || 'Admin';

  const displayRole =
    profile?.role
      ? roleLabel(profile.role)
      : 'Administrator';

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || 'A';

  return (
    <>
      {/* ====================================================== */}
      {/* MOBILE OVERLAY */}
      {/* ====================================================== */}

      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}

      {/* ====================================================== */}
      {/* SIDEBAR */}
      {/* ====================================================== */}

      <aside
        aria-label="Admin sidebar"
        aria-hidden={!mobileOpen}
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col',
          'border-r border-slate-200 bg-white shadow-xl lg:shadow-none',
          'transition-transform duration-200 ease-out',
          'lg:translate-x-0 lg:aria-hidden:false',
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full',
        ].join(' ')}
      >

        {/* ================================================== */}
        {/* BRAND */}
        {/* ================================================== */}

        <div className="flex h-[72px] shrink-0 items-center border-b border-slate-200 px-4 sm:px-5">

          <Link
            href="/admin/dashboard"
            onClick={onClose}
            aria-label="Pandurang Milk Product admin dashboard"
            className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition group-hover:ring-slate-300">
              <img
                src="/logo.png"
                alt=""
                className="h-full w-full object-contain"
              />

              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-600 ring-2 ring-white"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-950">
                Pandurang Milk Product
              </p>

              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                {profile?.role
                  ? roleLabel(profile.role)
                  : 'Operations'}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close admin navigation"
            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset active:scale-[0.98] lg:hidden"
          >
            <span
              aria-hidden="true"
              className="text-2xl font-light leading-none"
            >
              ×
            </span>
          </button>
        </div>

        {/* ================================================== */}
        {/* USER */}
        {/* ================================================== */}

        <div className="shrink-0 border-b border-slate-200 p-3 sm:p-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">

            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-800 ring-4 ring-white"
            >
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {displayRole}
              </p>
            </div>
          </div>
        </div>

        {/* ================================================== */}
        {/* NAVIGATION */}
        {/* ================================================== */}

        <nav
          aria-label="Admin navigation"
          className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4"
        >
          {groups.map((group) => (
            <section
              key={group.title}
              aria-labelledby={`sidebar-group-${group.title
                .toLowerCase()
                .replace(/\s+/g, '-')}`}
              className="mb-5 last:mb-2"
            >
              <div className="mb-2 flex items-center gap-2 px-3">
                <span
                  aria-hidden="true"
                  className="h-1 w-1 rounded-full bg-slate-300"
                />

                <span
                  id={`sidebar-group-${group.title
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
                >
                  {group.title}
                </span>
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(
                    pathname,
                    searchParams,
                    item.href,
                  );

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={
                        active
                          ? 'page'
                          : undefined
                      }
                      className={[
                        'group flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2',
                        'text-sm font-medium transition-all duration-150',
                        'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset',
                        active
                          ? 'bg-red-50 text-red-800 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 active:bg-slate-100',
                      ].join(' ')}
                    >
                      <span
                        aria-hidden="true"
                        className={[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150',
                          active
                            ? 'bg-red-100 text-red-700'
                            : 'text-slate-400 group-hover:bg-white group-hover:text-slate-600',
                        ].join(' ')}
                      >
                        <Icon name={item.icon} />
                      </span>

                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      {active ? (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600"
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* ================================================== */}
        {/* FOOTER ACTIONS */}
        {/* ================================================== */}

        <div className="shrink-0 border-t border-slate-200 bg-white p-3">

          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset active:bg-slate-100"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-base text-slate-500"
            >
              ↗
            </span>

            <span className="truncate">
              View Storefront
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset active:bg-red-100"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-base"
            >
              ⇥
            </span>

            <span>
              Logout
            </span>
          </button>

        </div>

        {/* ADMIN CORNER MARK */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500/70"
        />
      </aside>
    </>
  );
}