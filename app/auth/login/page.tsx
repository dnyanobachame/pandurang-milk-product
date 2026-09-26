'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Maps raw Supabase Auth errors to friendly, non-technical messages.
 * Never show `error.message` from Supabase directly to the user — it can
 * be inconsistent in wording and occasionally leaks implementation
 * details (e.g. exact rate-limit windows, provider internals).
 */
function friendlyLoginError(error: { message: string; status?: number } | null): string {
  if (!error) return 'Something went wrong. Please try again.';

  const msg = error.message.toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email address before signing in. Check your inbox for the confirmation link.';
  }
  if (msg.includes('too many requests') || error.status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network problem. Please check your connection and try again.';
  }
  return 'Could not sign in. Please check your details and try again.';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session) {
      setLoading(false);
      setError(friendlyLoginError(signInError));
      return;
    }

    // Account-active check happens here (rather than trusting middleware
    // alone) so we can show a clear message instead of a bounce through
    // /auth/deactivated with no explanation on this screen.
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', data.session.user.id)
      .single();

    if (profile && profile.is_active === false) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        'This account has been deactivated. Please contact support if you believe this is a mistake.'
      );
      return;
    }

    setLoading(false);

    const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';
    router.push(redirectTo);
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

        <p className="text-sm text-gray-500 mb-6">Welcome back</p>

        <label className="block text-sm font-medium mb-1" htmlFor="email">
          Email Address
        </label>

        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
        />

        <label className="block text-sm font-medium mb-1" htmlFor="password">
          Password
        </label>

        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-2"
        />

        <div className="text-right mb-4">
          <a href="/auth/forgot-password" className="text-sm text-brand-700 font-medium">
            Forgot Password?
          </a>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 mb-4">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p className="text-sm text-gray-500 mt-4 text-center">
          New customer?{' '}
          <a href="/auth/register" className="text-brand-700 font-medium">
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
          <div className="text-sm text-gray-500">Loading login…</div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
