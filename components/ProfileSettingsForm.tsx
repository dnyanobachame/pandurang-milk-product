'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateMyProfile } from '@/app/actions/profile';
import { createClient } from '@/lib/supabase/client';

export function ProfileSettingsForm({
  initialFullName,
  initialMobile,
  avatarUrl,
}: {
  initialFullName: string;
  initialMobile: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [mobile, setMobile] = useState(initialMobile);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] =
    useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState<{
    type: 'ok' | 'error';
    text: string;
  } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (saving || resettingPassword || loggingOut) {
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      setMessage({
        type: 'error',
        text: 'Please enter your full name.',
      });
      return;
    }

    if (!trimmedMobile) {
      setMessage({
        type: 'error',
        text: 'Please enter your mobile number.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const result = await updateMyProfile({
        fullName: trimmedName,
        mobile: trimmedMobile,
        avatarUrl,
      });

      if (result.error) {
        setMessage({
          type: 'error',
          text: result.error,
        });
        return;
      }

      setFullName(trimmedName);
      setMobile(trimmedMobile);

      setMessage({
        type: 'ok',
        text: 'Changes saved successfully.',
      });

      router.refresh();
    } catch {
      setMessage({
        type: 'error',
        text: 'Something went wrong while saving your profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (saving || resettingPassword || loggingOut) {
      return;
    }

    setResettingPassword(true);
    setMessage(null);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setMessage({
          type: 'error',
          text: 'Unable to find your account email. Please try again.',
        });
        return;
      }

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          user.email,
          {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          }
        );

      if (error) {
        setMessage({
          type: 'error',
          text: error.message || 'Unable to send the password reset link.',
        });
        return;
      }

      setMessage({
        type: 'ok',
        text: 'Password reset link sent to your email.',
      });
    } catch {
      setMessage({
        type: 'error',
        text: 'Something went wrong while sending the password reset link.',
      });
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleLogout() {
    if (saving || resettingPassword || loggingOut) {
      return;
    }

    setLoggingOut(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setMessage({
          type: 'error',
          text: 'Unable to log out. Please try again.',
        });
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setMessage({
        type: 'error',
        text: 'Something went wrong while logging out.',
      });
    } finally {
      setLoggingOut(false);
    }
  }

  const initial =
    fullName.trim().charAt(0).toUpperCase() || 'U';

  const busy =
    saving || resettingPassword || loggingOut;

  return (
    <form
      onSubmit={handleSave}
      className="w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-700"
            aria-hidden="true"
          >
            {initial}
          </span>
        )}

        <p className="text-sm leading-5 text-gray-500">
          Photo uploads aren't available yet — this shows your
          initial until then.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="fullName"
          >
            Full Name
          </label>

          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            disabled={busy}
            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="mobile"
          >
            Mobile Number
          </label>

          <input
            id="mobile"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            inputMode="tel"
            autoComplete="tel"
            disabled={busy}
            className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
      </div>

      {message && (
        <div
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`mt-4 rounded-lg border px-3 py-2.5 text-sm ${
            message.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 w-full rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={busy}
          className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {resettingPassword
            ? 'Sending…'
            : 'Change Password'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={busy}
          className="min-h-11 w-full rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loggingOut ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </form>
  );
}