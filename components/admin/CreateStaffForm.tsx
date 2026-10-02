'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStaffUser } from '@/app/actions/staff';
import type { AppRole } from '@/lib/roles';

const STAFF_ROLES: AppRole[] = [
  'production_manager',
  'production_staff',
  'quality_control',
  'packing_manager',
  'packing_staff',
  'inventory_manager',
  'sales_manager',
  'accountant',
  'customer_support',
  'delivery_manager',
  'delivery_partner',
  'admin',
];

function formatRole(role: AppRole) {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function CreateStaffForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    role: STAFF_ROLES[0] as AppRole,
    vehicleNumber: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError(null);

    const result = await createStaffUser({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile || undefined,
      role: form.role,
      vehicleNumber:
        form.role === 'delivery_partner'
          ? form.vehicleNumber
          : undefined,
    });

    setSaving(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setCreated({
      email: result.email!,
      tempPassword: result.tempPassword!,
    });

    setForm({
      fullName: '',
      email: '',
      mobile: '',
      role: STAFF_ROLES[0],
      vehicleNumber: '',
    });

    router.refresh();
  }

  if (created) {
    return (
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700"
          >
            ✓
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-emerald-900">
              Account created successfully
            </h2>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              The staff account is ready. Share the temporary credentials
              securely with the staff member.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </p>
            <p className="mt-1 break-all font-mono text-sm font-medium text-slate-800">
              {created.email}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Temporary password
            </p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">
              {created.tempPassword}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs leading-5 text-amber-800">
            <strong>Important:</strong> Share this password securely with the
            staff member. It will not be shown again. There is no self-service
            password reset yet, so if it is lost, the account must be deleted
            and recreated directly in Supabase Auth.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreated(null)}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-1"
        >
          + Add another staff member
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="create-staff-title"
    >
      <div>
        <h2
          id="create-staff-title"
          className="text-base font-bold text-slate-900"
        >
          Add Staff Member
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Create an account and assign the staff member&apos;s operational role.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="staff-full-name"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Full name
          </label>

          <input
            id="staff-full-name"
            required
            autoComplete="name"
            placeholder="Enter full name"
            value={form.fullName}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                fullName: e.target.value,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="staff-email"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Email
          </label>

          <input
            id="staff-email"
            required
            type="email"
            autoComplete="email"
            placeholder="staff@example.com"
            value={form.email}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                email: e.target.value,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="staff-mobile"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Mobile
            <span className="ml-1 font-normal text-slate-400">
              (optional)
            </span>
          </label>

          <input
            id="staff-mobile"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Enter mobile number"
            value={form.mobile}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                mobile: e.target.value,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>

        <div>
          <label
            htmlFor="staff-role"
            className="mb-1.5 block text-xs font-semibold text-slate-600"
          >
            Staff role
          </label>

          <select
            id="staff-role"
            required
            value={form.role}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                role: e.target.value as AppRole,
              }))
            }
            disabled={saving}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {formatRole(role)}
              </option>
            ))}
          </select>
        </div>

        {form.role === 'delivery_partner' && (
          <div className="sm:col-span-2">
            <label
              htmlFor="staff-vehicle-number"
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Vehicle number
            </label>

            <input
              id="staff-vehicle-number"
              placeholder="Enter vehicle number"
              value={form.vehicleNumber}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vehicleNumber: e.target.value,
                }))
              }
              disabled={saving}
              className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 uppercase outline-none transition placeholder:normal-case placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />

            <p className="mt-1.5 text-xs text-slate-400">
              Required for delivery partner accounts.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Creating...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </div>
    </form>
  );
}