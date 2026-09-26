'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setLoading(false);

    // Always show the same success message whether or not the email
    // exists — confirming/denying an email's existence is an information
    // leak (account enumeration).
    if (resetError && resetError.message.toLowerCase().includes('rate limit')) {
      setError('Too many requests. Please wait a few minutes and try again.');
      return;
    }
    setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-xl2 shadow-sm border border-gray-100 p-8">
        <h1 className="text-xl font-semibold text-brand-700 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we'll send you a link to reset your password.
        </p>

        {sent ? (
          <p className="text-sm text-gray-700">
            If an account exists for that email, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
            />

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-sm text-gray-500 mt-4 text-center">
          <a href="/auth/login" className="text-brand-700 font-medium">
            Back to Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
