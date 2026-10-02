'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { promoteUserToStaff } from '@/app/actions/staff';
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
];

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin',
  customer: 'Customer',
  production_manager: 'Production Manager',
  production_staff: 'Production Staff',
  quality_control: 'Quality Control',
  packing_manager: 'Packing Manager',
  packing_staff: 'Packing Staff',
  inventory_manager: 'Inventory Manager',
  sales_manager: 'Sales Manager',
  accountant: 'Accountant',
  customer_support: 'Customer Support',
  delivery_manager: 'Delivery Manager',
  delivery_partner: 'Delivery Partner',
};

export function UserRoleActions({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: AppRole;
}) {
  const router = useRouter();

  const [role, setRole] = useState<AppRole>(
    currentRole === 'customer'
      ? 'production_staff'
      : currentRole
  );

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /*
   * Admin accounts are protected from role changes in this UI.
   *
   * IMPORTANT:
   * The server action should also protect admin accounts.
   * UI protection alone is not a security boundary.
   */
  if (currentRole === 'admin') {
    return (
      <span
        role="status"
        className="inline-flex min-h-9 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-semibold text-slate-500"
      >
        Admin protected
      </span>
    );
  }

  async function handleChangeRole() {
    if (saving || !role) return;

    if (role === 'delivery_partner' && !vehicleNumber.trim()) {
      setMessage('Vehicle number is required.');
      return;
    }

    const roleName = ROLE_LABELS[role];

    const confirmed = window.confirm(
      `Change this user's role to "${roleName}"?\n\nThe user will be activated if currently inactive.`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage(null);

    try {
      const result = await promoteUserToStaff({
        userId,
        role,
        vehicleNumber:
          role === 'delivery_partner'
            ? vehicleNumber.trim().toUpperCase()
            : undefined,
      });

      if (!result?.ok) {
        setMessage(
          result?.error || 'Unable to update user role.'
        );
        return;
      }

      setMessage('Role updated successfully.');

      router.refresh();
    } catch (error) {
      console.error('User role update failed:', error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update user role.'
      );
    } finally {
      setSaving(false);
    }
  }

  const isSuccess =
    message?.includes('successfully') ?? false;

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="w-full sm:w-auto">
        <label
          htmlFor={`user-role-${userId}`}
          className="sr-only"
        >
          User role
        </label>

        <select
          id={`user-role-${userId}`}
          value={role}
          onChange={(e) => {
            setRole(e.target.value as AppRole);
            setMessage(null);
          }}
          disabled={saving}
          aria-label="User role"
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-auto sm:min-w-[190px]"
        >
          {STAFF_ROLES.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {role === 'delivery_partner' && (
        <div className="w-full sm:w-auto">
          <label
            htmlFor={`vehicle-number-${userId}`}
            className="sr-only"
          >
            Vehicle number
          </label>

          <input
            id={`vehicle-number-${userId}`}
            type="text"
            value={vehicleNumber}
            onChange={(e) => {
              setVehicleNumber(
                e.target.value.toUpperCase()
              );
              setMessage(null);
            }}
            disabled={saving}
            placeholder="Vehicle number"
            maxLength={20}
            autoComplete="off"
            aria-label="Vehicle number"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 sm:w-40"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleChangeRole}
        disabled={saving}
        aria-busy={saving}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {saving ? (
          <>
            <span
              aria-hidden="true"
              className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
            Saving…
          </>
        ) : currentRole === 'customer' ? (
          'Promote'
        ) : (
          'Update Role'
        )}
      </button>

      {message && (
        <span
          role={isSuccess ? 'status' : 'alert'}
          aria-live={isSuccess ? 'polite' : 'assertive'}
          className={`w-full text-xs font-medium leading-5 sm:w-auto ${
            isSuccess
              ? 'text-emerald-600'
              : 'text-red-600'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}