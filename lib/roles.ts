/**
 * Central definition of application roles and which route groups
 * each role is allowed into. Mirrors the `app_role` enum in
 * supabase/01_schema.sql — keep these in sync.
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
 * Route prefix -> roles allowed to access it. Checked in middleware.ts.
 * `admin` is implicitly allowed everywhere except the customer-only cart
 * (an admin browsing as a shopper is out of scope for v1).
 */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/admin': ['admin', 'sales_manager', 'accountant', 'customer_support'],
  '/admin/production/batches': [
    'admin', 'production_manager', 'production_staff', 'quality_control',
    'packing_manager', 'packing_staff',
  ],
  '/admin/production': ['admin', 'production_manager', 'production_staff', 'quality_control'],
  '/admin/inventory': ['admin', 'inventory_manager'],
  '/admin/delivery': ['admin', 'delivery_manager'],
  '/admin/suppliers': ['admin', 'production_manager', 'accountant'],
  '/admin/traceability': ['admin', 'sales_manager', 'customer_support', 'inventory_manager', 'production_manager'],
  '/admin/expenses': ['admin', 'accountant'],
  '/admin/reports': ['admin', 'accountant', 'sales_manager'],
  '/admin/settings': ['admin'],
  '/admin/users': ['admin'],
  '/packing': ['admin', 'packing_manager', 'packing_staff'],
  '/delivery': ['admin', 'delivery_manager', 'delivery_partner'],
  '/dashboard': ['customer'], // customer account area
};

/** Returns true if `role` may access `pathname` per ROUTE_ACCESS. */
export function canAccess(pathname: string, role: AppRole): boolean {
  if (role === 'admin') return true;

  const matches = Object.keys(ROUTE_ACCESS)
    .filter((prefix) => pathname.startsWith(prefix))
    // longest prefix wins so /admin/inventory doesn't fall back to the
    // looser /admin rule
    .sort((a, b) => b.length - a.length);

  if (matches.length === 0) return true; // unrestricted route (public pages)
  return ROUTE_ACCESS[matches[0]].includes(role);
}

/** Where to send a user immediately after login, based on their role. */
export function homeRouteForRole(role: AppRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'production_manager':
    case 'production_staff':
    case 'quality_control':
      return '/admin/production';
    case 'packing_manager':
    case 'packing_staff':
      return '/packing';
    case 'inventory_manager':
      return '/admin/inventory';
    case 'sales_manager':
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
