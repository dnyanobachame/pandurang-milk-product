import { createClient } from '@/lib/supabase/server';
import { CreateStaffForm } from '@/components/admin/CreateStaffForm';
import { UserActiveToggle } from '@/components/admin/UserActiveToggle';

export default async function UsersPage() {
  const supabase = createClient();

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, mobile, role, is_active')
    .neq('role', 'customer')
    .order('role');

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Staff &amp; Users</h1>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-2 pr-4">{s.full_name}</td>
                <td className="py-2 pr-4">{s.email}</td>
                <td className="py-2 pr-4 capitalize">{s.role.replace(/_/g, ' ')}</td>
                <td className="py-2 pr-4"><UserActiveToggle userId={s.id} isActive={s.is_active} /></td>
              </tr>
            ))}
            {(!staff || staff.length === 0) && (
              <tr><td colSpan={4} className="py-6 text-gray-500 text-center">No staff accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateStaffForm />
    </main>
  );
}
