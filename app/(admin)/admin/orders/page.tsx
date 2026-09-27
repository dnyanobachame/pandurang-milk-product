import { createClient } from '@/lib/supabase/server';
import { VerifyPaymentButton } from '@/components/VerifyPaymentButton';

export default async function AdminOrdersPage() {
  const supabase = createClient();

  const {
    data: orders,
    error: ordersError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      total,
      order_status,
      payment_status,
      payment_method,
      created_at,
      profiles!orders_customer_id_fkey (
        full_name,
        mobile
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (ordersError) {
    console.error('ADMIN ORDERS QUERY ERROR:', ordersError);
  }

  /*
   * Payment status is stored in the payments table.
   * We fetch it separately so Admin Orders can correctly show:
   *
   * payment_initiated
   * payment_submitted
   * paid
   * etc.
   */
  const orderIds = (orders ?? []).map((order: any) => order.id);

  const { data: payments, error: paymentsError } =
    orderIds.length > 0
      ? await supabase
          .from('payments')
          .select(`
            id,
            order_id,
            status,
            transaction_id,
            amount,
            payment_method,
            verified_at,
            paid_at
          `)
          .in('order_id', orderIds)
      : { data: [], error: null };

  if (paymentsError) {
    console.error('ADMIN PAYMENTS QUERY ERROR:', paymentsError);
  }

  const paymentByOrderId = new Map(
    (payments ?? []).map((payment: any) => [
      payment.order_id,
      payment,
    ])
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          Orders
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage customer orders and verify UPI payments.
        </p>
      </div>

      {ordersError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load orders. Check the server terminal for the
          database error.
        </div>
      )}

      {paymentsError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Orders loaded, but payment information could not be loaded.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[1050px] table-fixed text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
              <th className="w-[150px] px-4 py-3 font-medium">
                Order
              </th>

              <th className="w-[210px] px-4 py-3 font-medium">
                Customer
              </th>

              <th className="w-[110px] px-4 py-3 font-medium">
                Total
              </th>

              <th className="w-[220px] px-4 py-3 font-medium">
                Payment
              </th>

              <th className="w-[150px] px-4 py-3 font-medium">
                Status
              </th>

              <th className="w-[160px] px-4 py-3 font-medium">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {(orders ?? []).map((order: any) => {
              const payment = paymentByOrderId.get(order.id);

              const paymentStatus =
                payment?.status ?? order.payment_status ?? 'pending';

              const paymentMethod =
                payment?.payment_method ??
                order.payment_method ??
                'unknown';

              const canVerify =
                paymentMethod === 'upi_qr' &&
                paymentStatus === 'payment_submitted' &&
                Boolean(payment?.transaction_id);

              return (
                <tr
                  key={order.id}
                  className="border-b border-gray-50 hover:bg-gray-50/50"
                >
                  {/* ORDER */}
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium whitespace-nowrap">
                      #{order.order_number}
                    </div>

                    <div className="mt-1 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString(
                        'en-IN'
                      )}
                    </div>
                  </td>

                  {/* CUSTOMER */}
                  <td className="px-4 py-4 align-top">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {order.profiles?.full_name ?? 'Customer'}
                      </div>

                      {order.profiles?.mobile && (
                        <div className="mt-1 text-xs text-gray-500 whitespace-nowrap">
                          {order.profiles.mobile}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* TOTAL */}
                  <td className="px-4 py-4 align-top">
                    <span className="font-medium whitespace-nowrap">
                      ₹{Number(order.total ?? 0).toFixed(2)}
                    </span>
                  </td>

                  {/* PAYMENT */}
                  <td className="px-4 py-4 align-top">
                    <div className="capitalize">
                      {paymentMethod.replace(/_/g, ' ')}
                    </div>

                    <div className="mt-1">
                      {paymentStatus === 'payment_submitted' ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Payment Submitted
                        </span>
                      ) : paymentStatus === 'paid' ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          Paid
                        </span>
                      ) : paymentStatus === 'failed' ? (
                        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {paymentStatus.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    {payment?.transaction_id && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="font-medium">
                          Txn:
                        </span>{' '}
                        <span className="font-mono">
                          {payment.transaction_id}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* ORDER STATUS */}
                  <td className="px-4 py-4 align-top">
                    <span className="capitalize">
                      {String(order.order_status ?? 'pending').replace(
                        /_/g,
                        ' '
                      )}
                    </span>
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-4 align-top">
                    {canVerify ? (
                      <VerifyPaymentButton
                        orderId={order.id}
                      />
                    ) : paymentStatus === 'paid' ? (
                      <span className="text-sm font-medium text-green-700">
                        Verified ✓
                      </span>
                    ) : paymentMethod === 'upi_qr' &&
                      paymentStatus === 'payment_initiated' ? (
                      <span className="text-xs text-gray-500">
                        Awaiting payment
                      </span>
                    ) : paymentMethod === 'upi_qr' &&
                      paymentStatus === 'pending' ? (
                      <span className="text-xs text-gray-500">
                        Awaiting payment
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!ordersError &&
              (!orders || orders.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-gray-500"
                  >
                    No orders found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
