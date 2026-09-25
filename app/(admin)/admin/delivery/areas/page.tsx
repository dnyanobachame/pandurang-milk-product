import { createClient } from '@/lib/supabase/server';
import { DeliveryAreaRow } from '@/components/admin/DeliveryAreaRow';
import { NewAreaForm } from '@/components/admin/NewAreaForm';

export default async function DeliveryAreasPage() {
  const supabase = createClient();

  const { data: areas } = await supabase
    .from('delivery_areas')
    .select('id, city_or_village, pin_code, delivery_fee, free_delivery_above, is_active')
    .order('city_or_village');

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Delivery Areas</h1>

      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="py-2 pr-4">Area</th>
              <th className="py-2 pr-4">PIN</th>
              <th className="py-2 pr-4">Delivery Fee</th>
              <th className="py-2 pr-4">Free Above</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(areas ?? []).map((a) => (
              <DeliveryAreaRow
                key={a.id}
                id={a.id}
                cityOrVillage={a.city_or_village}
                pinCode={a.pin_code}
                deliveryFee={a.delivery_fee}
                freeDeliveryAbove={a.free_delivery_above}
                isActive={a.is_active}
              />
            ))}
          </tbody>
        </table>
      </div>

      <NewAreaForm />
    </main>
  );
}
