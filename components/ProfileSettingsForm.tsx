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
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await updateMyProfile({ fullName, mobile, avatarUrl });

    setSaving(false);
    setMessage(
      result.error
        ? { type: 'error', text: result.error }
        : { type: 'ok', text: 'Changes saved.' }
    );
    if (!result.error) router.refresh();
  }

  async function handleChangePassword() {
    setResettingPassword(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setResettingPassword(false);
      return;
    }

    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResettingPassword(false);
    setMessage({ type: 'ok', text: 'Password reset link sent to your email.' });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl2 border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-4 mb-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 text-2xl font-semibold flex items-center justify-center">
            {fullName.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="text-sm text-gray-500">
          Photo uploads aren't available yet — this shows your initial until then.
        </p>
      </div>

      <label className="block text-sm font-medium mb-1" htmlFor="fullName">
        Full Name
      </label>
      <input
        id="fullName"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
      />

      <label className="block text-sm font-medium mb-1" htmlFor="mobile">
        Mobile Number
      </label>
      <input
        id="mobile"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        required
        className="w-full rounded-lg border border-gray-200 px-3 py-2 mb-4"
      />

      {message && (
        <p className={`text-sm mb-4 ${message.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 text-white px-5 py-2.5 font-medium hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={handleChangePassword}
          disabled={resettingPassword}
          className="rounded-full border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          {resettingPassword ? 'Sending…' : 'Change Password'}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-red-200 text-red-600 px-5 py-2.5 font-medium hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </form>
  );
}
