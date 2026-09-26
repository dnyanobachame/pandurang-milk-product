import type { AppRole } from '@/lib/roles';

/**
 * Human-readable labels for the internal `app_role` enum values.
 * Never show the raw enum string (e.g. "production_manager") to a user —
 * always pass it through this map first.
 */
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  customer: 'Customer',
  production_manager: 'Production Manager',
  production_staff: 'Production Staff',
  quality_control: 'Quality Control',
  packing_manager: 'Packing Manager',
  packing_staff: 'Packing Staff',
  inventory_manager: 'Inventory Manager',
  sales_manager: 'Sales Manager',
  accountant: 'Accountant',
  customer_support: 'Customer Support',
  delivery_manager: 'Delivery Manager',
  delivery_partner: 'Delivery Partner',
};

export function roleLabel(role: AppRole | string | null | undefined): string {
  if (!role) return 'Customer';
  return ROLE_LABELS[role as AppRole] ?? 'Customer';
}
