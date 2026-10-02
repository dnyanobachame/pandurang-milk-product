'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  APP_ROLES,
  homeRouteForRole,
  type AppRole,
} from '@/lib/roles';

function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === 'string' &&
    (APP_ROLES as readonly string[]).includes(value)
  );
}

function passwordError(message: string): string {
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
    return 'Your new password must be different from your current password.';
  }

  if (
    msg.includes('expired') ||
    msg.includes('invalid') ||
    msg.includes('token')
  ) {
    return 'This password reset link is invalid or has expired. Please request a new reset link.';
  }

  return 'Could not update your password. Please try again.';
}

function validatePassword(password: string): string | null {
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

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/.test(password)) {
    return 'Password must contain at least one special character.';
  }

  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      const supabase = createClient();

      /**
       * Supabase processes the recovery session from the
       * email link and exposes it through the Auth client.
       *
       * getUser() verifies the authenticated user rather
       * than trusting URL parameters.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!mounted) {
          return;
        }

        setCheckingSession(false);
        setError(
          'This password reset link is invalid or has expired. Please request a new reset link.'
        );

        return;
      }

      /**
       * Verify the application profile and account status.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();

        if (!mounted) {
          return;
        }

        setCheckingSession(false);
        setError(
          'Your account profile could not be loaded. Please contact support.'
        );

        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut();

        if (!mounted) {
          return;
        }

        setCheckingSession(false);
        setError(
          'Your account has been deactivated. Please contact support.'
        );

        return;
      }

      if (!mounted) {
        return;
      }

      setCheckingSession(false);
      setReady(true);
    }

    checkRecoverySession();

    return () => {
      mounted = false;
    };
  }, []);

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
     * Re-check the authenticated user immediately before
     * changing the password.
     */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError(
        'Your password reset session has expired. Please request a new reset link.'
      );
      return;
    }

    /**
     * Re-check account status before modifying the password.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      setSaving(false);
      setError(
        'Your account profile could not be loaded. Please contact support.'
      );
      return;
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut();

      setSaving(false);
      setError(
        'Your account has been deactivated. Please contact support.'
      );

      return;
    }

    /**
     * Update only the Supabase Auth password.
     *
     * This flow intentionally does NOT call
     * completePasswordSetup(), because this is a normal
     * password recovery and not an administrator-created
     * temporary-password setup.
     */
    const {
      error: updateError,
    } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setSaving(false);
      setError(
        passwordError(updateError.message)
      );
      return;
    }

    /**
     * Validate the database role before using it for routing.
     */
    if (!isAppRole(profile.role)) {
      console.error(
        'Password reset completed but profile role is invalid:',
        {
          userId: user.id,
          role: profile.role,
        }
      );

      await supabase.auth.signOut();

      setSaving(false);
      setError(
        'Your password was changed, but your account role could not be verified. Please sign in again or contact support.'
      );

      return;
    }

    setSaving(false);
    setCompleted(true);

    /**
     * Give the user a moment to see the success state,
     * then route them to their normal role dashboard.
     */
    const role: AppRole = profile.role;
    const destination = homeRouteForRole(role);

    window.setTimeout(() => {
      router.replace(destination);
      router.refresh();
    }, 900);
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="text-center">
          <div
            className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-600"
            aria-hidden="true"
          />

          <p className="mt-3 text-sm text-gray-500">
            Verifying your reset link…
          </p>
        </div>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="w-full max-w-sm rounded-xl2 border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600"
            aria-hidden="true"
          >
            ✓
          </div>

          <h1 className="text-xl font-semibold text-gray-900">
            Password updated
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Your password has been changed successfully.
            Redirecting you to your dashboard…
          </p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="w-full max-w-sm rounded-xl2 border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">
            Reset link unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error ??
              'This password reset link is invalid or has expired.'}
          </p>

          <a
            href="/auth/forgot-password"
            className="mt-6 inline-block w-full rounded-full bg-brand-600 py-2.5 font-medium text-white transition hover:bg-brand-700"
          >
            Request a New Reset Link
          </a>

          <a
            href="/auth/login"
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Back to Sign In
          </a>
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
            Account recovery
          </p>

          <h1 className="mt-1 text-2xl font-semibold text-gray-900">
            Create a new password
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Choose a new password for your account.
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
            aria-live="polite"
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