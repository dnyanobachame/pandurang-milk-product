'use client';

import { useEffect, useState } from 'react';

type AdminSearchProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function AdminSearch({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: AdminSearchProps) {
  const [internalValue, setInternalValue] = useState(value ?? '');

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  function handleChange(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <div className={`relative ${className}`}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        ⌕
      </span>

      <input
        type="search"
        value={internalValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      />
    </div>
  );
}