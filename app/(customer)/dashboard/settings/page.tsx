import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { roleLabel } from '@/lib/role-labels';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/dashboard/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, mobile, email, role, is_active, avatar_url, created_at')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-1">My Profile / Settings</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your account details. Some fields are managed by Pandurang Milk Product staff
        and can't be changed here.
      </p>

      <div className="bg-white rounded-xl2 border border-gray-100 shadow-sm p-6 mb-6">
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-gray-500">Email</dt>
          <dd className="font-medium">{profile.email ?? user.email}</dd>

          <dt className="text-gray-500">Account Role</dt>
          <dd className="font-medium">{roleLabel(profile.role)}</dd>

          <dt className="text-gray-500">Account Status</dt>
          <dd>
            <span
              className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${
                profile.is_active
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {profile.is_active ? 'Active' : 'Inactive'}
            </span>
          </dd>

          <dt className="text-gray-500">Member Since</dt>
          <dd className="font-medium">
            {new Date(profile.created_at).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </dd>
        </dl>
      </div>

      <ProfileSettingsForm
        initialFullName={profile.full_name}
        initialMobile={profile.mobile ?? ''}
        avatarUrl={profile.avatar_url}
      />
    </main>
  );
}
