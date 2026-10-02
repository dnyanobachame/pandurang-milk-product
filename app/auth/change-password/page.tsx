'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import {
  completePasswordSetup,
} from '@/app/actions/profile';

import {
  homeRouteForRole,
  type AppRole,
} from '@/lib/roles';

function passwordError(message: string) {
  const msg = message.toLowerCase();

  if (
    msg.includes('password should contain') ||
    msg.includes('uppercase') ||
    msg.includes('lowercase') ||
    msg.includes('number') ||
    msg.includes('special character') ||
    msg.includes('symbol')
  ) {
    return 'Password must contain uppercase, lowercase, number, and special character.';
  }

  if (
    msg.includes('password') &&
    (
      msg.includes('weak') ||
      msg.includes('short') ||
      msg.includes('length') ||
      msg.includes('minimum')
    )
  ) {
    return 'Please enter a stronger password with at least 8 characters.';
  }

  if (
    msg.includes('same password') ||
    msg.includes('different')
  ) {
    return 'Your new password must be different from the temporary password.';
  }

  return 'Could not update your password. Please try again.';
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }

  if (
    !/[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(
      password
    )
  ) {
    return 'Password must contain at least one special character.';
  }

  return null;
}

export default function ChangePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace('/auth/login');
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select(
          'role, is_active, must_change_password'
        )
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        router.replace('/auth/login');
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();
        router.replace('/auth/login');
        return;
      }

      /**
       * If the user no longer needs to change the temporary
       * password, send them directly to their role dashboard.
       */
      if (!profile.must_change_password) {
        const role = profile.role as AppRole;

        router.replace(homeRouteForRole(role));
        return;
      }

      if (mounted) {
        setLoading(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (saving) {
      return;
    }

    setError(null);

    const validationError =
      validatePassword(newPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);

    const supabase = createClient();

    /**
     * Confirm that the user is still authenticated before
     * changing the password.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError(
        'Your session has expired. Please log in again.'
      );
      router.replace('/auth/login');
      return;
    }

    /**
     * Change the Supabase Auth password.
     */
    const {
      error: passwordErrorResult,
    } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (passwordErrorResult) {
      setSaving(false);
      setError(
        passwordError(passwordErrorResult.message)
      );
      return;
    }

    /**
     * Complete the account setup on the server.
     *
     * The server action clears only:
     *
     *   must_change_password
     *
     * for this authenticated user.
     */
    const result =
      await completePasswordSetup();

    if (result?.inactive) {
      await supabase.auth.signOut();
      router.replace('/auth/login');
      return;
    }

    if (result?.error) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if (!result?.ok || !result.role) {
      setSaving(false);
      setError(
        'Password changed successfully, but your dashboard could not be determined. Please log in again.'
      );
      return;
    }

    /**
     * Role comes from the protected profile record.
     *
     * Examples:
     *
     * admin              -> /admin/dashboard
     * delivery_partner   -> /delivery
     * packing_staff      -> /packing
     * customer           -> /dashboard
     */
    const role = result.role as AppRole;

    const destination =
      homeRouteForRole(role);

    router.replace(destination);
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600" />

          <p className="mt-3 text-sm text-gray-500">
            Checking your account…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl2 border border-gray-100 bg-white p-8 shadow-sm"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Account security
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            Create your new password
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            You are signing in with a temporary password
            created by the administrator. Create your own
            password before continuing.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-sm font-medium text-gray-800"
            >
              New password
            </label>

            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);

                if (error) {
                  setError(null);
                }
              }}
              disabled={saving}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
              placeholder="Enter your new password"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-sm font-medium text-gray-800"
            >
              Confirm new password
            </label>

            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);

                if (error) {
                  setError(null);
                }
              }}
              disabled={saving}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
              placeholder="Re-enter your new password"
            />
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-700">
            Password requirements
          </p>

          <ul className="mt-2 space-y-1 text-xs text-gray-500">
            <li>• At least 8 characters</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one lowercase letter</li>
            <li>• At least one number</li>
            <li>• At least one special character</li>
          </ul>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 w-full rounded-full bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? 'Updating password…'
            : 'Set New Password'}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          After changing your password, you will be
          redirected to your assigned dashboard.
        </p>
      </form>
    </main>
  );
}