'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setUserActive } from '@/app/actions/staff';

export function UserActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await setUserActive(userId, !isActive);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </button>
  );
}
