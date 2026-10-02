'use client';

import { useRouter } from 'next/navigation';

type AdminBackButtonProps = {
  fallbackHref?: string;
  label?: string;
};

export function AdminBackButton({
  fallbackHref = '/admin/dashboard',
  label = 'Back',
}: AdminBackButtonProps) {
  const router = useRouter();

  function handleBack() {
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-100 focus:ring-offset-1 active:bg-slate-100"
    >
      <span
        aria-hidden="true"
        className="text-base leading-none"
      >
        ←
      </span>

      <span>{label}</span>
    </button>
  );
}