type AdminStatusBadgeProps = {
  status: string | null | undefined;
  size?: 'sm' | 'md';
};

const STATUS_STYLES: Record<string, string> = {
  pending:
    'bg-amber-50 text-amber-700 border-amber-200',

  payment_pending:
    'bg-amber-50 text-amber-700 border-amber-200',

  payment_initiated:
    'bg-blue-50 text-blue-700 border-blue-200',

  payment_submitted:
    'bg-blue-50 text-blue-700 border-blue-200',

  paid:
    'bg-green-50 text-green-700 border-green-200',

  payment_confirmed:
    'bg-green-50 text-green-700 border-green-200',

  confirmed:
    'bg-green-50 text-green-700 border-green-200',

  placed:
    'bg-amber-50 text-amber-700 border-amber-200',

  packing:
    'bg-blue-50 text-blue-700 border-blue-200',

  packed:
    'bg-green-50 text-green-700 border-green-200',

  assigned:
    'bg-purple-50 text-purple-700 border-purple-200',

  accepted:
    'bg-purple-50 text-purple-700 border-purple-200',

  out_for_delivery:
    'bg-blue-50 text-blue-700 border-blue-200',

  delivered:
    'bg-green-50 text-green-700 border-green-200',

  cancelled:
    'bg-red-50 text-red-700 border-red-200',

  rejected:
    'bg-red-50 text-red-700 border-red-200',

  failed:
    'bg-red-50 text-red-700 border-red-200',

  delivery_failed:
    'bg-red-50 text-red-700 border-red-200',

  refund_requested:
    'bg-orange-50 text-orange-700 border-orange-200',

  refunded:
    'bg-slate-100 text-slate-600 border-slate-200',

  unassigned:
    'bg-slate-100 text-slate-600 border-slate-200',

  on_hold:
    'bg-orange-50 text-orange-700 border-orange-200',
};

function formatStatus(status: string | null | undefined) {
  if (!status) {
    return 'Unknown';
  }

  return String(status)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AdminStatusBadge({
  status,
  size = 'sm',
}: AdminStatusBadgeProps) {
  const normalized = String(status ?? '').toLowerCase();

  const label = formatStatus(status);

  const classes =
    STATUS_STYLES[normalized] ??
    'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <span
      aria-label={`Status: ${label}`}
      className={[
        'inline-flex items-center whitespace-nowrap rounded-full border font-semibold leading-none',
        size === 'md'
          ? 'px-3 py-1.5 text-xs'
          : 'px-2.5 py-1 text-[11px]',
        classes,
      ].join(' ')}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />

      {label}
    </span>
  );
}