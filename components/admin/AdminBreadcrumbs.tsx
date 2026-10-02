'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABELS: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  today: "Today's Products",
  production: 'Production',
  collections: 'Milk Collections',
  batches: 'Production Batches',
  quality: 'Quality Control',
  packing: 'Packing',
  inventory: 'Inventory',
  traceability: 'Batch Traceability',
  delivery: 'Delivery',
  areas: 'Delivery Areas',
  expenses: 'Expenses',
  reports: 'Reports',
  suppliers: 'Suppliers',
  users: 'Staff & Users',
  settings: 'Settings',
  whatsapp: 'WhatsApp',
  support: 'Support',
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();

  const parts = pathname
    .split('/')
    .filter(Boolean);

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-3 flex min-w-0 items-center gap-2 overflow-hidden text-xs text-slate-400"
    >
      <Link
        href="/admin"
        className="shrink-0 hover:text-slate-700"
      >
        Admin
      </Link>

      {parts
        .filter((part) => part !== 'admin')
        .map((part, index, array) => {
          const href =
            '/' +
            parts
              .slice(0, parts.indexOf(part) + 1)
              .join('/');

          const label =
            LABELS[part] ||
            part
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) =>
                c.toUpperCase()
              );

          const last =
            index === array.length - 1;

          return (
            <div
              key={`${part}-${index}`}
              className="flex min-w-0 items-center gap-2"
            >
              <span>/</span>

              {last ? (
                <span className="truncate font-medium text-slate-600">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="truncate hover:text-slate-700"
                >
                  {label}
                </Link>
              )}
            </div>
          );
        })}
    </nav>
  );
}