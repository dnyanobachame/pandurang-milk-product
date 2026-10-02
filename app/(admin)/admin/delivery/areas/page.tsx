import { createClient } from '@/lib/supabase/server';
import { DeliveryAreaRow } from '@/components/admin/DeliveryAreaRow';
import { NewAreaForm } from '@/components/admin/NewAreaForm';

export const dynamic = 'force-dynamic';

export default async function DeliveryAreasPage() {
  const supabase = createClient();

  const { data: areas, error } = await supabase
    .from('delivery_areas')
    .select(
      'id, city_or_village, pin_code, delivery_fee, free_delivery_above, is_active',
    )
    .order('city_or_village');

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            Fulfilment
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Delivery Areas
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage delivery locations, PIN codes, delivery fees, free-delivery
            thresholds, and area availability.
          </p>
        </div>

        <div className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {areas?.length ?? 0} {(areas?.length ?? 0) === 1 ? 'area' : 'areas'}
        </div>
      </div>

      {/* Database error */}
      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-800">
            Delivery areas could not be loaded.
          </p>
          <p className="mt-1 text-xs text-red-700">
            Check the server terminal for the exact Supabase error.
          </p>
        </div>
      ) : null}

      {/* Areas */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Configured Delivery Areas
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Customers can be served according to the active area settings.
            </p>
          </div>

          <span className="text-xs font-medium text-slate-500">
            {areas?.filter((area) => area.is_active).length ?? 0} active
          </span>
        </div>

        {(areas ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
              📍
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800">
              No delivery areas configured
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              Add your first delivery area below to define where deliveries
              are available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                  <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Area
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    PIN
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Delivery Fee
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Free Above
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(areas ?? []).map((area) => (
                  <DeliveryAreaRow
                    key={area.id}
                    id={area.id}
                    cityOrVillage={area.city_or_village}
                    pinCode={area.pin_code}
                    deliveryFee={area.delivery_fee}
                    freeDeliveryAbove={area.free_delivery_above}
                    isActive={area.is_active}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add area */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-600">
            Configuration
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Add Delivery Area
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Create a new delivery zone with its fee and free-delivery
            threshold.
          </p>
        </div>

        <NewAreaForm />
      </section>
    </div>
  );
}
