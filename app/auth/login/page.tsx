'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  APP_ROLES,
  homeRouteForRole,
  type AppRole,
} from '@/lib/roles';

/**
 * Maps raw Supabase Auth errors to friendly, non-technical messages.
 *
 * Never expose raw authentication errors to the customer.
 */
function friendlyLoginError(
  error: { message: string; status?: number } | null
): string {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (msg.includes('email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for the confirmation link.';
  }

  if (
    msg.includes('too many requests') ||
    error.status === 429
  ) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  if (
    msg.includes('network') ||
    msg.includes('fetch')
  ) {
    return 'Network problem. Please check your connection and try again.';
  }

  return 'Could not sign in. Please check your details and try again.';
}

/**
 * Runtime validation for the role loaded from the database.
 *
 * TypeScript casts do not validate runtime values. This prevents
 * an unexpected/invalid profile role from being used for routing.
 */
function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === 'string' &&
    (APP_ROLES as readonly string[]).includes(value)
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient();

    // ------------------------------------------------------------
    // 1. Sign in with Supabase Auth
    // ------------------------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    const {
      data,
      error: signInError,
    } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (
      signInError ||
      !data.session ||
      !data.user
    ) {
      setLoading(false);
      setError(friendlyLoginError(signInError));
      return;
    }

    // ------------------------------------------------------------
    // 2. Load the application profile
    // ------------------------------------------------------------

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select(
        'role, is_active, must_change_password'
      )
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();

      setLoading(false);

      setError(
        'Your account profile could not be loaded. Please contact support.'
      );

      return;
    }

    // ------------------------------------------------------------
    // 3. Active account check
    // ------------------------------------------------------------

    if (profile.is_active === false) {
      await supabase.auth.signOut();

      setLoading(false);

      setError(
        'This account has been deactivated. Please contact support if you believe this is a mistake.'
      );

      return;
    }

    // ------------------------------------------------------------
    // 4. Force temporary-password users to change password
    // ------------------------------------------------------------

    if (profile.must_change_password === true) {
      setLoading(false);

      router.replace('/auth/change-password');
      router.refresh();

      return;
    }

    // ------------------------------------------------------------
    // 5. Validate the application role
    // ------------------------------------------------------------

    if (!isAppRole(profile.role)) {
      console.error(
        'Login rejected invalid application role:',
        {
          userId: data.user.id,
          role: profile.role,
        }
      );

      await supabase.auth.signOut();

      setLoading(false);

      setError(
        'Your account role could not be verified. Please contact support.'
      );

      return;
    }

    const role: AppRole = profile.role;

    // ------------------------------------------------------------
    // 6. Resolve redirect
    // ------------------------------------------------------------

    const requestedRedirect =
      searchParams.get('redirectTo');

    /**
     * Only allow application-relative paths.
     *
     * Examples allowed:
     *   /dashboard
     *   /dashboard/orders
     *   /admin/orders
     *
     * Examples rejected:
     *   https://example.com
     *   //example.com
     */
    const isSafeRedirect =
      typeof requestedRedirect === 'string' &&
      requestedRedirect.startsWith('/') &&
      !requestedRedirect.startsWith('//');

    const redirectTo = isSafeRedirect
      ? requestedRedirect
      : homeRouteForRole(role);

    // ------------------------------------------------------------
    // 7. Navigate
    // ------------------------------------------------------------

    setLoading(false);

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white rounded-xl2 shadow-sm border border-gray-100 p-8"
      >
        <h1 className="text-xl font-semibold text-brand-700 mb-1">
          Sign in to Pandurang Milk Product
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Welcome back
        </p>

        <label
          className="block text-sm font-medium mb-1"
          htmlFor="email"
        >
          Email Address
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);

            if (error) {
              setError(null);
            }
          }}
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
        />

        <label
          className="block text-sm font-medium mb-1"
          htmlFor="password"
        >
          Password
        </label>

        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);

            if (error) {
              setError(null);
            }
          }}
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
        />

        <div className="text-right mb-4">
          <a
            href="/auth/forgot-password"
            className="text-sm text-brand-700 font-medium hover:text-brand-800"
          >
            Forgot Password?
          </a>
        </div>

        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600 mb-4"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          New customer?{' '}
          <a
            href="/auth/register"
            className="text-brand-700 font-medium hover:text-brand-800"
          >
            Create Account
          </a>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
          <div className="text-sm text-gray-500">
            Loading login…
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}