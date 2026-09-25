'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleAreaActive, updateDeliveryFee } from '@/app/actions/delivery-areas';

export function DeliveryAreaRow({
  id, cityOrVillage, pinCode, deliveryFee, freeDeliveryAbove, isActive,
}: {
  id: string; cityOrVillage: string; pinCode: string | null;
  deliveryFee: number; freeDeliveryAbove: number | null; isActive: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(String(deliveryFee));
  const [freeAbove, setFreeAbove] = useState(freeDeliveryAbove ? String(freeDeliveryAbove) : '');
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await toggleAreaActive(id, !isActive);
    setLoading(false);
    router.refresh();
  }

  async function handleSave() {
    setLoading(true);
    await updateDeliveryFee(id, Number(fee), freeAbove ? Number(freeAbove) : null);
    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 pr-4">{cityOrVillage}</td>
      <td className="py-2 pr-4 text-gray-500">{pinCode ?? '—'}</td>
      <td className="py-2 pr-4">
        {editing ? (
          <input value={fee} onChange={(e) => setFee(e.target.value)} className="w-20 rounded border border-gray-200 px-2 py-0.5" />
        ) : (
          <>₹{deliveryFee}</>
        )}
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <input value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} placeholder="none" className="w-24 rounded border border-gray-200 px-2 py-0.5" />
        ) : (
          freeDeliveryAbove ? `₹${freeDeliveryAbove}` : '—'
        )}
      </td>
      <td className="py-2 pr-4">
        <button onClick={handleToggle} disabled={loading} className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <button onClick={handleSave} disabled={loading} className="text-xs text-brand-700 font-medium">Save</button>
        ) : (
          <button onClick={() => setEditing(true)} className="text-xs text-brand-700 font-medium">Edit</button>
        )}
      </td>
    </tr>
  );
}
