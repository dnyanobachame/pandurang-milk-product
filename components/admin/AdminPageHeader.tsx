import Link from 'next/link';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
};

export function AdminPageHeader({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: AdminPageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-1"
          >
            + {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}