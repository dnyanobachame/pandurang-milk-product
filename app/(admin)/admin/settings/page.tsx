import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description="Manage your Pandurang Milk Product admin configuration."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            Store Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage store information and business details.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            Delivery Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure delivery areas, fees and availability.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            Notification Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure admin and customer notifications.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            Payment Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage payment and verification configuration.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            WhatsApp Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Configure WhatsApp communication settings.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900">
            System Settings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage general administration settings.
          </p>
        </div>
      </div>
    </div>
  );
}