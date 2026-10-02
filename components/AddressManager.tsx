'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deleteAddress,
  saveAddress,
  setDefaultAddress,
} from '@/app/actions/addresses';
import {
  ADDRESS_LABEL_PRESETS,
  type SavedAddress,
} from '@/lib/address-schema';
import { formatAddress } from '@/lib/format-address';

type FormState = {
  labelChoice: string;
  customLabel: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  addressLine2: string;
  landmark: string;
  villageCity: string;
  taluka: string;
  district: string;
  state: string;
  pinCode: string;
  deliveryInstructions: string;
  isDefault: boolean;
};

const EMPTY: FormState = {
  labelChoice: 'Home',
  customLabel: '',
  recipientName: '',
  phone: '',
  addressLine: '',
  addressLine2: '',
  landmark: '',
  villageCity: '',
  taluka: '',
  district: 'Latur',
  state: 'Maharashtra',
  pinCode: '',
  deliveryInstructions: '',
  isDefault: false,
};

function fromAddress(a: SavedAddress): FormState {
  const label = a.label ?? 'Home';
  const isPreset = (
    ADDRESS_LABEL_PRESETS as readonly string[]
  ).includes(label);

  return {
    labelChoice: isPreset ? label : 'Other',
    customLabel: isPreset ? '' : label,
    recipientName: a.recipient_name ?? '',
    phone: a.phone ?? '',
    addressLine: a.address_line,
    addressLine2: a.address_line_2 ?? '',
    landmark: a.landmark ?? '',
    villageCity: a.village_city,
    taluka: a.taluka ?? '',
    district: a.district,
    state: a.state ?? 'Maharashtra',
    pinCode: a.pin_code,
    deliveryInstructions: a.delivery_instructions ?? '',
    isDefault: a.is_default,
  };
}

export function AddressManager({
  addresses,
}: {
  addresses: SavedAddress[];
}) {
  const router = useRouter();

  const [mode, setMode] = useState<null | 'new' | string>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(
    null
  );

  const [message, setMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  function set<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openNew() {
    setForm(EMPTY);
    setMode('new');
    setConfirmDeleteId(null);
    setMessage(null);
  }

  function openEdit(address: SavedAddress) {
    setForm(fromAddress(address));
    setMode(address.id);
    setConfirmDeleteId(null);
    setMessage(null);
  }

  function closeForm() {
    if (busy) return;

    setMode(null);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setMessage(null);

    const label =
      form.labelChoice === 'Other'
        ? form.customLabel.trim() || 'Other'
        : form.labelChoice;

    try {
      const result = await saveAddress(
        {
          label,
          recipientName: form.recipientName,
          phone: form.phone,
          addressLine: form.addressLine,
          addressLine2: form.addressLine2,
          landmark: form.landmark,
          villageCity: form.villageCity,
          taluka: form.taluka,
          district: form.district,
          state: form.state,
          pinCode: form.pinCode,
          deliveryInstructions: form.deliveryInstructions,
          isDefault: form.isDefault,
        },
        mode && mode !== 'new' ? mode : undefined
      );

      if ('error' in result) {
        setMessage({
          kind: 'error',
          text: result.error,
        });
        return;
      }

      setMode(null);

      setMessage({
        kind: 'ok',
        text: 'Address saved successfully.',
      });

      router.refresh();
    } catch {
      setMessage({
        kind: 'error',
        text: 'Something went wrong while saving the address. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSetDefault(id: string) {
    if (busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const result = await setDefaultAddress(id);

      if ('error' in result) {
        setMessage({
          kind: 'error',
          text: result.error,
        });
        return;
      }

      setMessage({
        kind: 'ok',
        text: 'Default address updated successfully.',
      });

      router.refresh();
    } catch {
      setMessage({
        kind: 'error',
        text: 'Something went wrong while changing the default address.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (busy) return;

    setBusy(true);
    setMessage(null);

    try {
      const result = await deleteAddress(id);

      if ('error' in result) {
        setMessage({
          kind: 'error',
          text: result.error,
        });

        setConfirmDeleteId(null);
        return;
      }

      setConfirmDeleteId(null);

      setMessage({
        kind: 'ok',
        text: 'Address deleted successfully.',
      });

      router.refresh();
    } catch {
      setConfirmDeleteId(null);

      setMessage({
        kind: 'error',
        text: 'Something went wrong while deleting the address. Please try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
          Delivery Addresses
        </h1>

        {mode === null && (
          <button
            type="button"
            onClick={openNew}
            className="min-h-11 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 active:bg-brand-800 sm:w-auto"
          >
            + Add New Address
          </button>
        )}
      </div>

      {message && (
        <div
          role={message.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
            message.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {mode !== null && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          aria-label={
            mode === 'new'
              ? 'Add new address'
              : 'Edit address'
          }
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'new'
                ? 'Add New Address'
                : 'Edit Address'}
            </h2>

            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="min-h-10 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Address label"
              value={form.labelChoice}
              onChange={(value) => set('labelChoice', value)}
              options={[...ADDRESS_LABEL_PRESETS]}
            />

            {form.labelChoice === 'Other' && (
              <Field
                label="Custom label (optional)"
                value={form.customLabel}
                onChange={(value) => set('customLabel', value)}
                maxLength={30}
              />
            )}

            <Field
              label="Recipient name"
              value={form.recipientName}
              onChange={(value) => set('recipientName', value)}
              required
              autoComplete="name"
            />

            <Field
              label="Mobile number"
              value={form.phone}
              onChange={(value) =>
                set(
                  'phone',
                  value.replace(/\D/g, '').slice(0, 10)
                )
              }
              required
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
            />

            <Field
              label="House / Flat / Shop, street"
              value={form.addressLine}
              onChange={(value) => set('addressLine', value)}
              required
              full
            />

            <Field
              label="Address line 2 (optional)"
              value={form.addressLine2}
              onChange={(value) => set('addressLine2', value)}
              full
            />

            <Field
              label="Landmark (optional)"
              value={form.landmark}
              onChange={(value) => set('landmark', value)}
              full
            />

            <Field
              label="Village / City"
              value={form.villageCity}
              onChange={(value) => set('villageCity', value)}
              required
            />

            <Field
              label="Taluka (optional)"
              value={form.taluka}
              onChange={(value) => set('taluka', value)}
            />

            <Field
              label="District"
              value={form.district}
              onChange={(value) => set('district', value)}
              required
            />

            <Field
              label="State"
              value={form.state}
              onChange={(value) => set('state', value)}
              required
            />

            <Field
              label="PIN code"
              value={form.pinCode}
              onChange={(value) =>
                set(
                  'pinCode',
                  value.replace(/\D/g, '').slice(0, 6)
                )
              }
              required
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
            />

            <Field
              label="Delivery instructions (optional)"
              value={form.deliveryInstructions}
              onChange={(value) =>
                set('deliveryInstructions', value)
              }
              full
              maxLength={300}
            />
          </div>

          <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                set('isDefault', e.target.checked)
              }
              className="h-5 w-5 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>Make this my default address</span>
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 w-full rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {busy ? 'Saving…' : 'Save Address'}
            </button>

            <button
              type="button"
              onClick={closeForm}
              disabled={busy}
              className="min-h-11 w-full rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-900">
                {address.label ?? 'Address'}
              </span>

              {address.is_default && (
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  Default
                </span>
              )}
            </div>

            {(address.recipient_name || address.phone) && (
              <p className="mt-1 text-sm text-gray-700">
                {[address.recipient_name, address.phone]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}

            <p className="mt-1 text-sm leading-6 text-gray-600">
              {formatAddress(address)}
            </p>

            {address.delivery_instructions && (
              <p className="mt-2 text-xs leading-5 text-gray-500">
                Note: {address.delivery_instructions}
              </p>
            )}

            {confirmDeleteId === address.id ? (
              <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="mb-3 text-sm font-medium text-gray-800">
                  Delete this address?
                </p>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleDelete(address.id)}
                    disabled={busy}
                    className="min-h-11 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Deleting…' : 'Yes, delete'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={busy}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(address)}
                  disabled={busy}
                  className="min-h-10 rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit
                </button>

                {!address.is_default && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSetDefault(address.id)
                    }
                    disabled={busy}
                    className="min-h-10 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Set as default
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setConfirmDeleteId(address.id)
                  }
                  disabled={busy}
                  className="min-h-10 rounded-lg px-3 text-sm font-semibold text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {addresses.length === 0 && mode === null && (
        <div className="py-10 text-center">
          <p className="mb-3 text-sm text-gray-500">
            No saved addresses yet.
          </p>

          <button
            type="button"
            onClick={openNew}
            className="min-h-11 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Add your first address
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  full = false,
  maxLength,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  full?: boolean;
  maxLength?: number;
  inputMode?: 'numeric' | 'text';
  autoComplete?: string;
}) {
  const id = useId();

  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const id = useId();

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}