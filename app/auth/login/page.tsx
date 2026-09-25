
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mobileOrEmail, setMobileOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: mobileOrEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setError(
        'Could not sign in. Please check your details and try again.'
      );
      return;
    }

    const redirectTo =
      searchParams.get('redirectTo') ?? '/dashboard';

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
          Welcome back
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          Sign in to Pandurang Milk Product
        </p>

        <label className="block text-sm font-medium mb-1">
          Email
        </label>

        <input
          type="email"
          required
          value={mobileOrEmail}
          onChange={(e) => setMobileOrEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
        />

        <label className="block text-sm font-medium mb-1">
          Password
        </label>

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
        />

        {error && (
          <p className="text-sm text-red-600 mb-4">
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
          New here?{' '}
          <a
            href="/auth/register"
            className="text-brand-700 font-medium"
          >
            Create an account
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
