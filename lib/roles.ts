/**
 * Central definition of application roles and route access.
 *
 * Keep APP_ROLES in sync with the Supabase app_role enum.
 *
 * Security model:
 * 1. UI/sidebar hides modules the role does not need.
 * 2. middleware.ts blocks direct URL access.
 * 3. Server actions + Supabase RLS remain the final authorization layer.
 */

export const APP_ROLES = [
  'admin',
  'production_manager',
  'production_staff',
  'quality_control',
  'packing_manager',
  'packing_staff',
  'inventory_manager',
  'sales_manager',
  'accountant',
  'customer_support',
  'delivery_manager',
  'delivery_partner',
  'customer',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/**
 * Route prefix -> roles allowed to access the route.
 *
 * IMPORTANT:
 * Do not add a broad `/admin` permission for operational roles.
 * Every important Admin module gets an explicit permission.
 *
 * Longest matching prefix wins in canAccess().
 */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  // ============================================================
  // ADMIN DASHBOARD
  // ============================================================

  '/admin/dashboard': [
    'admin',
    'sales_manager',
    'accountant',
    'customer_support',
  ],

  // ============================================================
  // ADMIN USER / SYSTEM MANAGEMENT
  // ============================================================

  '/admin/users': [
    'admin',
  ],

  '/admin/settings': [
    'admin',
  ],

  // ============================================================
  // PRODUCTS
  // ============================================================

  '/admin/products': [
    'admin',
    'sales_manager',
    'inventory_manager',
  ],

  // ============================================================
  // PRODUCTION
  // ============================================================

  '/admin/production/collections': [
    'admin',
    'production_manager',
    'production_staff',
  ],

  '/admin/production/batches': [
    'admin',
    'production_manager',
    'production_staff',
    'quality_control',
    'packing_manager',
    'packing_staff',
  ],

  '/admin/production/quality': [
    'admin',
    'production_manager',
    'quality_control',
  ],

  '/admin/production': [
    'admin',
    'production_manager',
    'production_staff',
    'quality_control',
  ],

  // ============================================================
  // INVENTORY
  // ============================================================

  '/admin/inventory': [
    'admin',
    'inventory_manager',
  ],

  // ============================================================
  // SUPPLIERS
  // ============================================================

  '/admin/suppliers': [
    'admin',
    'production_manager',
    'accountant',
  ],

  // ============================================================
  // ORDERS / SALES
  // ============================================================

  '/admin/orders': [
    'admin',
    'sales_manager',
    'customer_support',
    'accountant',
  ],

  // ============================================================
  // DELIVERY
  // ============================================================

  '/admin/delivery/areas': [
    'admin',
    'delivery_manager',
  ],

  '/admin/delivery': [
    'admin',
    'delivery_manager',
  ],

  // ============================================================
  // EXPENSES / FINANCE
  // ============================================================

  '/admin/expenses': [
    'admin',
    'accountant',
  ],

  '/admin/reports': [
    'admin',
    'accountant',
    'sales_manager',
  ],

  // ============================================================
  // TRACEABILITY
  // ============================================================

  '/admin/traceability': [
    'admin',
    'production_manager',
    'inventory_manager',
    'sales_manager',
    'customer_support',
  ],

  // ============================================================
  // WHATSAPP / CUSTOMER COMMUNICATION
  // ============================================================

  '/admin/whatsapp': [
    'admin',
    'sales_manager',
    'customer_support',
  ],

  // ============================================================
  // PACKING
  // ============================================================

  '/packing': [
    'admin',
    'packing_manager',
    'packing_staff',
  ],

  // ============================================================
  // DELIVERY PARTNER
  // ============================================================

  '/delivery': [
    'admin',
    'delivery_manager',
    'delivery_partner',
  ],

  // ============================================================
  // CUSTOMER AREA
  // ============================================================

  '/dashboard': [
    'customer',
  ],
};

/**
 * Returns true if the role can access the requested pathname.
 *
 * Rules:
 *
 * - admin has full application access.
 * - More-specific route prefixes override broader prefixes.
 * - Unknown /admin routes are DENIED for non-admin users.
 * - Unknown public routes remain accessible because middleware
 *   handles authentication/public-route decisions separately.
 */
export function canAccess(
  pathname: string,
  role: AppRole
): boolean {
  // Admin has full administrative access.
  if (role === 'admin') {
    return true;
  }

  const matches = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => {
      return (
        pathname === prefix ||
        pathname.startsWith(`${prefix}/`)
      );
    })
    .sort((a, b) => b.length - a.length);

  /*
   * If this is an Admin route but there is no explicit rule,
   * deny it rather than accidentally granting access.
   */
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (matches.length === 0) {
      return false;
    }
  }

  /*
   * Same protection for operational areas.
   */
  if (pathname === '/packing' || pathname.startsWith('/packing/')) {
    if (matches.length === 0) {
      return false;
    }
  }

  if (
    pathname === '/delivery' ||
    pathname.startsWith('/delivery/')
  ) {
    if (matches.length === 0) {
      return false;
    }
  }

  if (
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/')
  ) {
    if (matches.length === 0) {
      return false;
    }
  }

  /*
   * Routes without an authorization rule are public/unrestricted.
   */
  if (matches.length === 0) {
    return true;
  }

  return ROUTE_ACCESS[matches[0]].includes(role);
}

/**
 * Default landing page after login.
 */
export function homeRouteForRole(
  role: AppRole
): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';

    case 'production_manager':
      return '/admin/production';

    case 'production_staff':
      return '/admin/production';

    case 'quality_control':
      return '/admin/production';

    case 'packing_manager':
      return '/packing';

    case 'packing_staff':
      return '/packing';

    case 'inventory_manager':
      return '/admin/inventory';

    case 'sales_manager':
      return '/admin/dashboard';

    case 'accountant':
      return '/admin/dashboard';

    case 'customer_support':
      return '/admin/dashboard';

    case 'delivery_manager':
      return '/admin/delivery';

    case 'delivery_partner':
      return '/delivery';

    case 'customer':
    default:
      return '/dashboard';
  }
}