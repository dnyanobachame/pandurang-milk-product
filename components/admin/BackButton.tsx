'use client';

import { useRouter } from 'next/navigation';

type Props = {
  fallback?: string;
  label?: string;
};

export default function BackButton({
  fallback = '/admin/dashboard',
  label = 'Back',
}: Props) {
  const router = useRouter();

  function handleBack() {
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1
    ) {
      router.back();
      return;
    }

    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      className="
        inline-flex min-h-11 items-center justify-center gap-2
        rounded-xl border border-gray-200
        bg-white px-4
        text-sm font-semibold text-gray-700
        shadow-sm
        transition
        hover:border-gray-300 hover:bg-gray-50
        focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2
        active:scale-[0.98]
      "
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