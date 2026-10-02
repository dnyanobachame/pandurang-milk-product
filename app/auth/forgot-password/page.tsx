'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isRateLimitError(error: {
  message?: string;
  status?: number;
} | null): boolean {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';

  return (
    error.status === 429 ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (loading) {
      return;
    }

    setError(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const {
      error: resetError,
    } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    setLoading(false);

    // ------------------------------------------------------------
    // Rate-limit handling
    // ------------------------------------------------------------
    //
    // A rate-limit response can safely be shown because it does
    // not reveal whether the email belongs to an account.
    // ------------------------------------------------------------

    if (isRateLimitError(resetError)) {
      setError(
        'Too many requests. Please wait a few minutes and try again.'
      );
      return;
    }

    // ------------------------------------------------------------
    // Generic response
    // ------------------------------------------------------------
    //
    // Do not expose other Supabase errors here.
    //
    // Showing the same success state regardless of whether the
    // email exists prevents account enumeration.
    // ------------------------------------------------------------

    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-xl2 shadow-sm border border-gray-100 p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            Account recovery
          </p>

          <h1 className="mt-1 text-xl font-semibold text-brand-700">
            Reset your password
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Enter your email and we&apos;ll send you a
            link to reset your password.
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-green-100 bg-green-50 px-4 py-3"
          >
            <p className="text-sm leading-6 text-gray-700">
              If an account exists for that email, a
              reset link is on its way. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              className="block text-sm font-medium mb-1 text-gray-800"
              htmlFor="email"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              maxLength={254}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                if (error) {
                  setError(null);
                }
              }}
              disabled={loading}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 mb-4 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-gray-50"
            />

            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="text-sm text-red-600 mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 transition"
            >
              {loading
                ? 'Sending…'
                : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-500 mt-4 text-center">
          <a
            href="/auth/login"
            className="text-brand-700 font-medium hover:text-brand-800"
          >
            Back to Sign In
          </a>
        </p>
      </div>
    </main>
  );
}