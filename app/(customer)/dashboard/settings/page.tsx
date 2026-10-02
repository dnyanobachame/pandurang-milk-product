import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { roleLabel } from '@/lib/role-labels';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectTo=/dashboard/settings');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, mobile, email, role, is_active, avatar_url, created_at'
    )
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login');
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-gray-600 transition hover:bg-white hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <span aria-hidden="true">←</span>
          Dashboard
        </Link>

        {/* Header */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                '👤'
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Account
              </p>

              <h1 className="mt-1 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                My Profile & Settings
              </h1>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Manage your account details and profile information.
              </p>
            </div>
          </div>
        </section>

        {/* Account information */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">
              Account Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Some account fields are managed by Pandurang Milk Product staff
              and can&apos;t be changed here.
            </p>
          </div>

          <dl className="divide-y divide-gray-100">
            <div className="flex flex-col gap-1 py-4 first:pt-0 sm:grid sm:grid-cols-2 sm:gap-4">
              <dt className="text-sm text-gray-500">Email</dt>

              <dd className="break-all text-sm font-semibold text-gray-900 sm:text-right">
                {profile.email ?? user.email ?? 'Not available'}
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-4 sm:grid sm:grid-cols-2 sm:gap-4">
              <dt className="text-sm text-gray-500">Account Role</dt>

              <dd className="text-sm font-semibold text-gray-900 sm:text-right">
                {roleLabel(profile.role)}
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-4 sm:grid sm:grid-cols-2 sm:gap-4">
              <dt className="text-sm text-gray-500">Account Status</dt>

              <dd className="sm:text-right">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                    profile.is_active
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  <span
                    className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                      profile.is_active ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  {profile.is_active ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>

            <div className="flex flex-col gap-1 py-4 last:pb-0 sm:grid sm:grid-cols-2 sm:gap-4">
              <dt className="text-sm text-gray-500">Member Since</dt>

              <dd className="text-sm font-semibold text-gray-900 sm:text-right">
                {new Date(profile.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </section>

        {/* Editable profile */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-gray-900">
              Profile Details
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Update the personal information used for your account and
              deliveries.
            </p>
          </div>

          <ProfileSettingsForm
            initialFullName={profile.full_name}
            initialMobile={profile.mobile ?? ''}
            avatarUrl={profile.avatar_url}
          />
        </section>

        {/* Account security */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Account Security
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Reset your account password securely using your registered
                email address.
              </p>
            </div>

            <Link
              href="/auth/forgot-password"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 px-5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              Reset Password
            </Link>
          </div>
        </section>

        {/* Quick links */}
        <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-gray-900">
            Account Shortcuts
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              href="/dashboard/addresses"
              className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <p className="text-sm font-semibold text-gray-900">
                Addresses
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Manage delivery addresses.
              </p>
            </Link>

            <Link
              href="/dashboard/notifications"
              className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <p className="text-sm font-semibold text-gray-900">
                Notifications
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Manage order and delivery alerts.
              </p>
            </Link>

            <Link
              href="/dashboard/support"
              className="rounded-xl border border-gray-200 p-4 transition hover:border-brand-200 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <p className="text-sm font-semibold text-gray-900">
                Support
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Get help with your account or orders.
              </p>
            </Link>
          </div>
        </section>

        {/* Bottom actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard/orders"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            View My Orders
          </Link>

          <Link
            href="/products"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            Shop Products
          </Link>
        </div>
      </div>
    </main>
  );
}