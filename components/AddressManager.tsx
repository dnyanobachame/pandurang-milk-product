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
const isPreset = (ADDRESS_LABEL_PRESETS as readonly string[]).includes(label);

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
const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

const [message, setMessage] = useState<{
kind: 'ok' | 'error';
text: string;
} | null>(null);

function set<K extends keyof FormState>(
key: K,
value: FormState[K]
) {
setForm((f) => ({ ...f, [key]: value }));
}

function openNew() {
setForm(EMPTY);
setMode('new');
setConfirmDeleteId(null);
setMessage(null);
}

function openEdit(a: SavedAddress) {
setForm(fromAddress(a));
setMode(a.id);
setConfirmDeleteId(null);
setMessage(null);
}

function closeForm() {
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

    // Keep the confirmation area closed, but keep the error visible.
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

return ( <div> <div className="flex items-center justify-between mb-6"> <h1 className="text-2xl font-semibold">
Delivery Addresses </h1>

    {mode === null && (
      <button
        type="button"
        onClick={openNew}
        className="rounded-full bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700"
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
      className="rounded-xl2 border border-gray-200 bg-white p-4 mb-6 space-y-3"
      aria-label={
        mode === 'new' ? 'Add new address' : 'Edit address'
      }
    >
      <h2 className="font-medium">
        {mode === 'new' ? 'Add New Address' : 'Edit Address'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          label="Address label"
          value={form.labelChoice}
          onChange={(v) => set('labelChoice', v)}
          options={[...ADDRESS_LABEL_PRESETS]}
        />

        {form.labelChoice === 'Other' && (
          <Field
            label="Custom label (optional)"
            value={form.customLabel}
            onChange={(v) => set('customLabel', v)}
            maxLength={30}
          />
        )}

        <Field
          label="Recipient name"
          value={form.recipientName}
          onChange={(v) => set('recipientName', v)}
          required
          autoComplete="name"
        />

        <Field
          label="Mobile number"
          value={form.phone}
          onChange={(v) =>
            set(
              'phone',
              v.replace(/\D/g, '').slice(0, 10)
            )
          }
          required
          inputMode="numeric"
          autoComplete="tel-national"
        />

        <Field
          label="House / Flat / Shop, street"
          value={form.addressLine}
          onChange={(v) => set('addressLine', v)}
          required
          full
        />

        <Field
          label="Address line 2 (optional)"
          value={form.addressLine2}
          onChange={(v) => set('addressLine2', v)}
          full
        />

        <Field
          label="Landmark (optional)"
          value={form.landmark}
          onChange={(v) => set('landmark', v)}
          full
        />

        <Field
          label="Village / City"
          value={form.villageCity}
          onChange={(v) => set('villageCity', v)}
          required
        />

        <Field
          label="Taluka (optional)"
          value={form.taluka}
          onChange={(v) => set('taluka', v)}
        />

        <Field
          label="District"
          value={form.district}
          onChange={(v) => set('district', v)}
          required
        />

        <Field
          label="State"
          value={form.state}
          onChange={(v) => set('state', v)}
          required
        />

        <Field
          label="PIN code"
          value={form.pinCode}
          onChange={(v) =>
            set(
              'pinCode',
              v.replace(/\D/g, '').slice(0, 6)
            )
          }
          required
          inputMode="numeric"
          autoComplete="postal-code"
        />

        <Field
          label="Delivery instructions (optional)"
          value={form.deliveryInstructions}
          onChange={(v) => set('deliveryInstructions', v)}
          full
          maxLength={300}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) =>
            set('isDefault', e.target.checked)
          }
        />
        Make this my default address
      </label>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand-600 text-white px-5 py-2 text-sm font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Save Address'}
        </button>

        <button
          type="button"
          onClick={closeForm}
          disabled={busy}
          className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )}

  <ul className="space-y-3">
    {addresses.map((a) => (
      <li
        key={a.id}
        className="rounded-xl2 border border-gray-100 bg-white p-4 text-sm"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">
            {a.label ?? 'Address'}
          </span>

          {a.is_default && (
            <span className="text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
              Default
            </span>
          )}
        </div>

        {(a.recipient_name || a.phone) && (
          <p className="text-gray-700">
            {[a.recipient_name, a.phone]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        <p className="text-gray-600">
          {formatAddress(a)}
        </p>

        {a.delivery_instructions && (
          <p className="text-gray-500 text-xs mt-1">
            Note: {a.delivery_instructions}
          </p>
        )}

        {confirmDeleteId === a.id ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm">
              Delete this address?
            </span>

            <button
              type="button"
              onClick={() => handleDelete(a.id)}
              disabled={busy}
              className="rounded-full bg-red-600 text-white px-4 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {busy ? 'Deleting…' : 'Yes, delete'}
            </button>

            <button
              type="button"
              onClick={() =>
                setConfirmDeleteId(null)
              }
              disabled={busy}
              className="rounded-full border border-gray-300 px-4 py-1.5 text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => openEdit(a)}
              disabled={busy}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Edit
            </button>

            {!a.is_default && (
              <button
                type="button"
                onClick={() =>
                  handleSetDefault(a.id)
                }
                disabled={busy}
                className="text-xs font-medium text-gray-600 hover:underline"
              >
                Set as default
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setConfirmDeleteId(a.id)
              }
              disabled={busy}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </li>
    ))}
  </ul>

  {addresses.length === 0 && mode === null && (
    <div className="text-center py-10">
      <p className="text-gray-500 text-sm mb-3">
        No saved addresses yet.
      </p>

      <button
        type="button"
        onClick={openNew}
        className="rounded-full bg-brand-600 text-white px-5 py-2 text-sm font-medium"
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
onChange: (v: string) => void;
required?: boolean;
full?: boolean;
maxLength?: number;
inputMode?: 'numeric' | 'text';
autoComplete?: string;
}) {
const id = useId();

return (
<div className={full ? 'sm:col-span-2' : ''}> <label
     htmlFor={id}
     className="block text-sm font-medium"
   >
{label} </label>

  <input
    id={id}
    value={value}
    onChange={(e) =>
      onChange(e.target.value)
    }
    required={required}
    maxLength={maxLength}
    inputMode={inputMode}
    autoComplete={autoComplete}
    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal"
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
onChange: (v: string) => void;
options: string[];
}) {
const id = useId();

return ( <div> <label
     htmlFor={id}
     className="block text-sm font-medium"
   >
{label} </label>

  <select
    id={id}
    value={value}
    onChange={(e) =>
      onChange(e.target.value)
    }
    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
</div>

);
}
