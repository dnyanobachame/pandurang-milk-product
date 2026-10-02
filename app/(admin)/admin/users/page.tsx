import { createClient } from '@/lib/supabase/server';
import { CreateStaffForm } from '@/components/admin/CreateStaffForm';
import { UserActiveToggle } from '@/components/admin/UserActiveToggle';
import { UserRoleActions } from '@/components/admin/UserRoleActions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import type { AppRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = createClient();

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, mobile, role, is_active')
    .order('role')
    .order('full_name');

  const staff =
    users?.filter((user) => user.role !== 'customer') ?? [];

  const customers =
    users?.filter((user) => user.role === 'customer') ?? [];

  const activeUsers =
    users?.filter((user) => user.is_active).length ?? 0;

  const inactiveUsers =
    users?.filter((user) => !user.is_active).length ?? 0;

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        title="Staff & Users"
        description="Manage staff accounts, customer accounts, roles and access."
      />

      {/* Error */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Unable to load users
          </p>
          <p className="mt-1 text-sm text-red-700">
            Please refresh the page and try again.
          </p>
        </div>
      ) : null}

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total Users
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {users?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            All registered accounts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Staff Accounts
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {staff.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Admin and operational users
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Customers
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {customers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Customer accounts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Active Users
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">
            {activeUsers}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {inactiveUsers} inactive
          </p>
        </div>
      </section>

      {/* Staff Accounts */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Staff Accounts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Admin and operational staff accounts.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {staff.length} account{staff.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="min-w-[360px] px-5 py-3">
                  Admin Control
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {staff.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {user.full_name || 'Unnamed user'}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {user.email || '—'}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {user.mobile || '—'}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <UserActiveToggle
                      userId={user.id}
                      isActive={user.is_active}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <UserRoleActions
                      userId={user.id}
                      currentRole={user.role as AppRole}
                    />
                  </td>
                </tr>
              ))}

              {staff.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <p className="font-medium text-slate-900">
                        No staff accounts found
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Create a staff account using the form below.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Accounts */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Customer Accounts
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Existing customers can be promoted to operational roles.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            {customers.length} customer
            {customers.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Mobile</th>
                <th className="px-5 py-3">Status</th>
                <th className="min-w-[390px] px-5 py-3">
                  Admin Control
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {customers.map((user) => (
                <tr
                  key={user.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {user.full_name || 'Unnamed user'}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {user.email || '—'}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {user.mobile || '—'}
                  </td>

                  <td className="px-5 py-4">
                    <UserActiveToggle
                      userId={user.id}
                      isActive={user.is_active}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <UserRoleActions
                      userId={user.id}
                      currentRole={user.role as AppRole}
                    />
                  </td>
                </tr>
              ))}

              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center"
                  >
                    <p className="font-medium text-slate-900">
                      No customer accounts found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Customer accounts will appear here when registered.
                    </p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Staff */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Create Staff Account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add a new employee or operational user to the system.
          </p>
        </div>

        <div className="p-5">
          <CreateStaffForm />
        </div>
      </section>
    </div>
  );
}