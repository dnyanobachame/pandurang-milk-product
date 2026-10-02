'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignDeliveryPartner } from '@/app/actions/delivery';

type Partner = {
  id: string;
  name: string;
  onDuty: boolean;
};

type AssignPartnerFormProps = {
  orderId: string;
  partners: Partner[];
};

export function AssignPartnerForm({
  orderId,
  partners,
}: AssignPartnerFormProps) {
  const router = useRouter();

  const availablePartners = partners;

  const [partnerId, setPartnerId] = useState(
    availablePartners.find((partner) => partner.onDuty)?.id ??
      availablePartners[0]?.id ??
      ''
  );

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPartner = availablePartners.find(
    (partner) => partner.id === partnerId
  );

  function handleRequestAssignment() {
    if (loading) return;

    setError(null);

    if (!partnerId || !selectedPartner) {
      setError('Please select a delivery partner.');
      return;
    }

    setShowConfirmation(true);
  }

  function handleCancelConfirmation() {
    if (loading) return;

    setShowConfirmation(false);
    setError(null);
  }

  async function handleConfirmAssignment() {
    if (!partnerId || !selectedPartner || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await assignDeliveryPartner(orderId, partnerId);

      if (result?.error) {
        setError(result.error);
        return;
      }

      setShowConfirmation(false);
      router.refresh();
    } catch (err) {
      console.error('Delivery assignment failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (availablePartners.length === 0) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            !
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">
              No active delivery partners
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Create or activate a delivery partner before assigning this
              order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3">
      {!showConfirmation ? (
        <>
          <div className="space-y-2">
            <label
              htmlFor={`delivery-partner-${orderId}`}
              className="text-xs font-bold uppercase tracking-wide text-slate-500"
            >
              Delivery partner
            </label>

            <select
              id={`delivery-partner-${orderId}`}
              value={partnerId}
              onChange={(event) => {
                setPartnerId(event.target.value);
                setError(null);
              }}
              disabled={loading}
              className="min-h-[48px] w-full touch-manipulation rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              {availablePartners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                  {partner.onDuty ? ' · On duty' : ' · Off duty'}
                </option>
              ))}
            </select>
          </div>

          {selectedPartner && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {selectedPartner.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Selected delivery partner
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    selectedPartner.onDuty
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {selectedPartner.onDuty ? 'On duty' : 'Off duty'}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRequestAssignment}
            disabled={loading || !partnerId}
            className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Assign Delivery Partner
          </button>
        </>
      ) : (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <p className="text-sm font-bold text-slate-900">
            Confirm assignment
          </p>

          <p className="mt-1 text-sm leading-5 text-slate-600">
            Assign order to{' '}
            <strong className="text-slate-900">
              {selectedPartner?.name}
            </strong>
            ?
          </p>

          {selectedPartner && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-white px-3 py-3">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Partner status
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {selectedPartner.onDuty ? 'On duty' : 'Off duty'}
                </p>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  selectedPartner.onDuty
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {selectedPartner.onDuty ? 'Available' : 'Off duty'}
              </span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleCancelConfirmation}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Go Back
            </button>

            <button
              type="button"
              onClick={handleConfirmAssignment}
              disabled={loading || !selectedPartner}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Assigning…' : 'Confirm Assignment'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-3"
        >
          <p className="text-sm font-medium leading-5 text-red-700">
            {error}
          </p>
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        Assignment starts as <strong>Assigned</strong>. The delivery partner
        must accept it before starting delivery.
      </p>
    </div>
  );
}