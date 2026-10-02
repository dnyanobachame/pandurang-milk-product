'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  toggleAreaActive,
  updateDeliveryFee,
} from '@/app/actions/delivery-areas';

export function DeliveryAreaRow({
  id,
  cityOrVillage,
  pinCode,
  deliveryFee,
  freeDeliveryAbove,
  isActive,
}: {
  id: string;
  cityOrVillage: string;
  pinCode: string | null;
  deliveryFee: number;
  freeDeliveryAbove: number | null;
  isActive: boolean;
}) {
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(String(deliveryFee));
  const [freeAbove, setFreeAbove] = useState(
    freeDeliveryAbove ? String(freeDeliveryAbove) : '',
  );
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    if (loading) return;

    setLoading(true);

    try {
      await toggleAreaActive(id, !isActive);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (loading) return;

    const feeValue = Number(fee);
    const freeAboveValue = freeAbove
      ? Number(freeAbove)
      : null;

    if (!Number.isFinite(feeValue) || feeValue < 0) {
      return;
    }

    if (
      freeAboveValue !== null &&
      (!Number.isFinite(freeAboveValue) || freeAboveValue < 0)
    ) {
      return;
    }

    setLoading(true);

    try {
      await updateDeliveryFee(
        id,
        feeValue,
        freeAboveValue,
      );

      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setFee(String(deliveryFee));
    setFreeAbove(
      freeDeliveryAbove ? String(freeDeliveryAbove) : '',
    );
    setEditing(false);
  }

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
      <td className="py-3 pr-4 font-medium text-slate-800">
        {cityOrVillage}
      </td>

      <td className="py-3 pr-4 text-slate-500">
        {pinCode ?? '—'}
      </td>

      <td className="py-3 pr-4">
        {editing ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">₹</span>

            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              aria-label={`Delivery fee for ${cityOrVillage}`}
              disabled={loading}
              className="min-h-[40px] w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        ) : (
          <span className="font-medium text-slate-800">
            ₹{deliveryFee}
          </span>
        )}
      </td>

      <td className="py-3 pr-4">
        {editing ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-slate-500">₹</span>

            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={freeAbove}
              onChange={(e) =>
                setFreeAbove(e.target.value)
              }
              placeholder="None"
              aria-label={`Free delivery threshold for ${cityOrVillage}`}
              disabled={loading}
              className="min-h-[40px] w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>
        ) : (
          <span className="text-slate-700">
            {freeDeliveryAbove
              ? `₹${freeDeliveryAbove}`
              : '—'}
          </span>
        )}
      </td>

      <td className="py-3 pr-4">
        <button
          type="button"
          onClick={handleToggle}
          disabled={loading}
          aria-label={`Set ${cityOrVillage} ${
            isActive ? 'inactive' : 'active'
          }`}
          aria-pressed={isActive}
          className={[
            'inline-flex min-h-[32px] items-center rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-red-100 focus:ring-offset-1',
            isActive
              ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
              : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
          ].join(' ')}
        >
          {loading
            ? 'Updating…'
            : isActive
              ? 'Active'
              : 'Inactive'}
        </button>
      </td>

      <td className="py-3 pr-4">
        {editing ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex min-h-[40px] items-center rounded-lg px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={loading}
            className="inline-flex min-h-[40px] items-center rounded-lg px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>
        )}
      </td>
    </tr>
  );
}