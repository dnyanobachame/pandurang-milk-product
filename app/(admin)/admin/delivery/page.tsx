import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AssignPartnerForm } from '@/components/delivery/AssignPartnerForm';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

type DeliveryPartner = {
  id: string;
  full_name: string | null;
  delivery_partners:
    | {
        is_on_duty: boolean;
      }[]
    | {
        is_on_duty: boolean;
      }
    | null;
};

type CustomerAddress = {
  address_line: string | null;
  village_city: string | null;
  taluka: string | null;
  district: string | null;
  pin_code: string | null;
  landmark: string | null;
};

type CustomerProfile = {
  full_name: string | null;
  mobile: string | null;
};

type ReadyOrder = {
  id: string;
  order_number: string;
  total: number;
  payment_method: string | null;
  delivery_status: string | null;
  delivery_slot: string | null;
  delivery_date: string | null;
  customer_addresses:
    | CustomerAddress
    | CustomerAddress[]
    | null;
  profiles:
    | CustomerProfile
    | CustomerProfile[]
    | null;
};

type ActiveAssignment = {
  id: string;
  status: string;
  order_id: string;
  assigned_at: string | null;
  accepted_at: string | null;
  out_for_delivery_at: string | null;

  orders:
    | {
        order_number: string;
        total: number;
        payment_method: string | null;
        delivery_date: string | null;
        delivery_slot: string | null;
        delivery_status: string | null;
        customer_addresses:
          | CustomerAddress
          | CustomerAddress[]
          | null;
        profiles:
          | CustomerProfile
          | CustomerProfile[]
          | null;
      }
    | {
        order_number: string;
        total: number;
        payment_method: string | null;
        delivery_date: string | null;
        delivery_slot: string | null;
        delivery_status: string | null;
        customer_addresses:
          | CustomerAddress
          | CustomerAddress[]
          | null;
        profiles:
          | CustomerProfile
          | CustomerProfile[]
          | null;
      }[]
    | null;

  profiles:
    | CustomerProfile
    | CustomerProfile[]
    | null;
};

function firstRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (!value) return null;

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function formatCurrency(
  value: number | string | null | undefined,
) {
  const amount = Number(value ?? 0);

  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string | null | undefined) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function displayStatus(
  status: string | null | undefined,
) {
  return String(status ?? 'unknown')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizePhone(
  phone: string | null | undefined,
) {
  if (!phone) return '';

  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

function getAddress(
  value:
    | CustomerAddress
    | CustomerAddress[]
    | null
    | undefined,
) {
  return firstRelation(value);
}

function getProfile(
  value:
    | CustomerProfile
    | CustomerProfile[]
    | null
    | undefined,
) {
  return firstRelation(value);
}

function StatCard({
  label,
  value,
  description,
  href,
  tone = 'default',
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  tone?:
    | 'default'
    | 'warning'
    | 'success'
    | 'danger'
    | 'blue';
}) {
  const toneClasses = {
    default: 'border-slate-200 bg-white',
    warning: 'border-amber-200 bg-amber-50',
    success: 'border-emerald-200 bg-emerald-50',
    danger: 'border-red-200 bg-red-50',
    blue: 'border-blue-200 bg-blue-50',
  };

  const numberClasses = {
    default: 'text-slate-900',
    warning: 'text-amber-800',
    success: 'text-emerald-800',
    danger: 'text-red-800',
    blue: 'text-blue-800',
  };

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. ${description}`}
      className={`group block rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${toneClasses[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <span
          aria-hidden="true"
          className="text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          ↗
        </span>
      </div>

      <p
        className={`mt-1 text-2xl font-bold tracking-tight ${numberClasses[tone]}`}
      >
        {value}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {description}
      </p>

      <p className="mt-2 text-[10px] font-semibold text-slate-400 group-hover:text-brand-600">
        Open details
      </p>
    </Link>
  );
}

function StatusBadge({
  status,
}: {
  status: string | null | undefined;
}) {
  const normalized = String(
    status ?? 'unknown',
  ).toLowerCase();

  const styles: Record<string, string> = {
    assigned: 'bg-purple-100 text-purple-700',
    accepted: 'bg-indigo-100 text-indigo-700',
    picked_up: 'bg-violet-100 text-violet-700',
    out_for_delivery:
      'bg-blue-100 text-blue-700',
    reached_customer:
      'bg-orange-100 text-orange-700',
    delivered:
      'bg-emerald-100 text-emerald-700',
    failed:
      'bg-red-100 text-red-700',
    packed:
      'bg-emerald-100 text-emerald-700',
  };

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        styles[normalized] ??
        'bg-slate-100 text-slate-600'
      }`}
    >
      {displayStatus(normalized)}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default async function AdminDeliveryPage() {
  const supabase = createClient();

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const [
    {
      data: unassignedOrders,
      error: unassignedError,
    },
    {
      data: activeAssignments,
      error: assignmentsError,
    },
    {
      data: partners,
      error: partnersError,
    },
    { count: deliveredToday },
    { count: failedToday },
  ] = await Promise.all([
    /*
     * READY FOR ASSIGNMENT
     *
     * Only use columns that exist in the project schema.
     */
    supabase
      .from('orders')
      .select(
        `
          id,
          order_number,
          total,
          payment_method,
          delivery_status,
          delivery_slot,
          delivery_date,

          customer_addresses(
            address_line,
            village_city,
            taluka,
            district,
            pin_code,
            landmark
          ),

          profiles!orders_customer_id_fkey(
            full_name,
            mobile
          )
        `,
      )
      .eq('order_status', 'packed')
      .is('delivery_partner_id', null)
      .order('created_at', {
        ascending: true,
      }),

    /*
     * ACTIVE DELIVERY ASSIGNMENTS
     */
    supabase
      .from('delivery_assignments')
      .select(
        `
          id,
          status,
          order_id,
          assigned_at,
          accepted_at,
          out_for_delivery_at,

          orders(
            order_number,
            total,
            payment_method,
            delivery_date,
            delivery_slot,
            delivery_status,

            customer_addresses(
              address_line,
              village_city,
              taluka,
              district,
              pin_code,
              landmark
            ),

            profiles!orders_customer_id_fkey(
              full_name,
              mobile
            )
          ),

          profiles!delivery_assignments_delivery_partner_id_fkey(
            full_name,
            mobile
          )
        `,
      )
      .in('status', [
        'assigned',
        'accepted',
        'picked_up',
        'out_for_delivery',
        'reached_customer',
      ])
      .order('assigned_at', {
        ascending: true,
      }),

    /*
     * DELIVERY PARTNERS
     */
    supabase
      .from('profiles')
      .select(
        `
          id,
          full_name,
          delivery_partners(is_on_duty)
        `,
      )
      .eq('role', 'delivery_partner')
      .eq('is_active', true),

    /*
     * DELIVERED TODAY
     */
    supabase
      .from('delivery_assignments')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'delivered')
      .gte(
        'delivered_at',
        `${today}T00:00:00.000Z`,
      )
      .lt(
        'delivered_at',
        `${today}T23:59:59.999Z`,
      ),

    /*
     * FAILED TODAY
     *
     * We intentionally do not use updated_at because
     * that column is not part of the known delivery
     * schema.
     *
     * The total failed count is safer until a dedicated
     * failed_at timestamp exists.
     */
    supabase
      .from('delivery_assignments')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('status', 'failed'),
  ]);

  const readyOrders =
    (unassignedOrders ?? []) as ReadyOrder[];

  const assignments =
    (activeAssignments ?? []) as ActiveAssignment[];

  const deliveryPartners =
    (partners ?? []) as DeliveryPartner[];

  const onDutyPartners =
    deliveryPartners.filter((partner) => {
      const relation = firstRelation(
        partner.delivery_partners,
      );

      return relation?.is_on_duty === true;
    });

  const assignedCount =
    assignments.filter(
      (item) =>
        item.status === 'assigned' ||
        item.status === 'accepted',
    ).length;

  const outForDeliveryCount =
    assignments.filter(
      (item) =>
        item.status === 'picked_up' ||
        item.status === 'out_for_delivery',
    ).length;

  const reachedCustomerCount =
    assignments.filter(
      (item) =>
        item.status === 'reached_customer',
    ).length;

  const dataErrors = [
    unassignedError,
    assignmentsError,
    partnersError,
  ].filter(Boolean);

  return (
    <div className="w-full">
      {/* HEADER */}
      <AdminPageHeader
        title="Delivery Operations"
        description="Assign packed orders, monitor delivery progress, and resolve delivery problems."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/orders?status=assigned"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            View Assigned Orders
          </Link>

          <Link
            href="/admin/orders?status=out_for_delivery"
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            Out for Delivery
          </Link>
        </div>
      </AdminPageHeader>

      {/* DATABASE ERROR */}
      {dataErrors.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-800">
            Delivery data could not be loaded.
          </p>

          <p className="mt-1 text-xs text-red-700">
            One of the delivery database queries returned
            an error. Check the server terminal for the
            exact Supabase error.
          </p>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Ready"
          value={readyOrders.length}
          href="#ready-assignment" 
          description="Waiting for assignment"
          tone={
            readyOrders.length > 0
              ? 'warning'
              : 'default'
          }
        />

        <StatCard
          label="Assigned"
          value={assignedCount}
          href="#active-deliveries" 
          description="Waiting / accepted"
          tone={
            assignedCount > 0
              ? 'blue'
              : 'default'
          }
        />

        <StatCard
          label="On the Way"
          value={outForDeliveryCount}
          href="#active-deliveries" 
          description="Currently out"
          tone={
            outForDeliveryCount > 0
              ? 'blue'
              : 'default'
          }
        />

        <StatCard
          label="At Customer"
          value={reachedCustomerCount}
          href="#active-deliveries" 
          description="OTP confirmation"
          tone={
            reachedCustomerCount > 0
              ? 'warning'
              : 'default'
          }
        />

        <StatCard
          label="Delivered Today"
          value={deliveredToday ?? 0}
          href="/admin/orders?status=delivered" 
          description="Completed today"
          tone="success"
        />

        <StatCard
          label="Problems"
          value={failedToday ?? 0}
          href="/admin/orders?status=failed" 
          description="Failed deliveries"
          tone={
            failedToday
              ? 'danger'
              : 'default'
          }
        />
      </div>

      {/* PARTNER AVAILABILITY */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Delivery Partner Availability
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Only on-duty partners can receive new
              delivery assignments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
              {onDutyPartners.length} On Duty
            </span>

            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {deliveryPartners.length} Active
            </span>
          </div>
        </div>

        {onDutyPartners.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {onDutyPartners.map((partner) => (
              <div
                key={partner.id}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold text-emerald-800">
                  {partner.full_name ||
                    'Delivery Partner'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
            <p className="text-xs font-semibold text-amber-800">
              No delivery partners are currently on
              duty.
            </p>

            <p className="mt-1 text-[11px] text-amber-700">
              Packed orders will remain in Ready for
              Assignment until a partner becomes
              available.
            </p>
          </div>
        )}
      </section>

      {/* READY FOR ASSIGNMENT */}
      <section id="ready-assignment" className="mt-6 scroll-mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Ready for Assignment
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Packed orders that do not have a delivery
              partner yet.
            </p>
          </div>

          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            {readyOrders.length}
          </span>
        </div>

        {readyOrders.length === 0 ? (
          <EmptyState
            title="No orders waiting for assignment"
            description="All currently packed orders have a delivery partner or there are no packed orders."
          />
        ) : (
          <div className="space-y-3">
            {readyOrders.map((order) => {
              const address = getAddress(
                order.customer_addresses,
              );

              const profile = getProfile(
                order.profiles,
              );

              const customerName =
                profile?.full_name ||
                'Customer';

              const phone =
                profile?.mobile || '';

              const phoneDigits =
                normalizePhone(phone);

              const whatsappMessage =
                encodeURIComponent(
                  `Hello ${customerName}, regarding your Pandurang Milk order #${order.order_number}.`,
                );

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-brand-600"
                        >
                          #{order.order_number}
                        </Link>

                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                          Packed
                        </span>

                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-700">
                          {String(
                            order.payment_method ??
                              'unknown',
                          ).replace(
                            /_/g,
                            ' ',
                          )}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <InfoItem
                          label="Customer"
                          value={customerName}
                        />

                        <InfoItem
                          label="Location"
                          value={
                            address?.village_city ||
                            address?.address_line ||
                            'Address not available'
                          }
                        />

                        <InfoItem
                          label="Order Total"
                          value={formatCurrency(
                            order.total,
                          )}
                        />

                        <InfoItem
                          label="Delivery"
                          value={
                            order.delivery_slot ||
                            formatDate(
                              order.delivery_date,
                            )
                          }
                        />
                      </div>

                      {phoneDigits && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={`tel:+${phoneDigits}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Call Customer
                          </a>

                          <a
                            href={`https://wa.me/${phoneDigits}?text=${whatsappMessage}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="w-full xl:w-[390px]">
                      <AssignPartnerForm
                        orderId={order.id}
                        partners={onDutyPartners.map(
                          (partner) => ({
                            id: partner.id,
                            name:
                              partner.full_name ||
                              'Delivery Partner',
                            onDuty: true,
                          }),
                        )}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ACTIVE DELIVERIES */}
      <section id="active-deliveries" className="mt-8 scroll-mt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Active Deliveries
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Monitor assigned orders from acceptance
              through customer confirmation.
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
            {assignments.length}
          </span>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            title="No active deliveries"
            description="Assigned delivery work will appear here automatically."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {assignments.map((assignment) => {
              const order = firstRelation(
                assignment.orders,
              );

              const partner = getProfile(
                assignment.profiles,
              );

              if (!order) return null;

              const address = getAddress(
                order.customer_addresses,
              );

              const customer = getProfile(
                order.profiles,
              );

              const customerName =
                customer?.full_name ||
                'Customer';

              const phone =
                customer?.mobile || '';

              const phoneDigits =
                normalizePhone(phone);

              return (
                <article
                  key={assignment.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${assignment.order_id}`}
                        className="text-sm font-bold text-slate-900 hover:text-brand-600"
                      >
                        #{order.order_number}
                      </Link>

                      <p className="mt-1 text-xs text-slate-500">
                        {customerName}
                      </p>
                    </div>

                    <StatusBadge
                      status={assignment.status}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <InfoItem
                      label="Delivery Partner"
                      value={
                        partner?.full_name ||
                        'Not available'
                      }
                    />

                    <InfoItem
                      label="Amount"
                      value={formatCurrency(
                        order.total,
                      )}
                    />

                    <InfoItem
                      label="Location"
                      value={
                        address?.village_city ||
                        address?.address_line ||
                        'Address unavailable'
                      }
                    />

                    <InfoItem
                      label="Delivery Slot"
                      value={
                        order.delivery_slot ||
                        formatDate(
                          order.delivery_date,
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <TimelineValue
                        label="Assigned"
                        value={formatTime(
                          assignment.assigned_at,
                        )}
                      />

                      <TimelineValue
                        label="Accepted"
                        value={formatTime(
                          assignment.accepted_at,
                        )}
                      />

                      <TimelineValue
                        label="Started"
                        value={formatTime(
                          assignment.out_for_delivery_at,
                        )}
                      />

                      <TimelineValue
                        label="Current"
                        value={displayStatus(
                          assignment.status,
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/orders/${assignment.order_id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      View Order
                    </Link>

                    {phoneDigits && (
                      <>
                        <a
                          href={`tel:+${phoneDigits}`}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Call
                        </a>

                        <a
                          href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                            `Hello ${customerName}, regarding your Pandurang Milk order #${order.order_number}.`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* QUICK LINKS */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink
          href="/admin/orders?status=assigned"
          title="Assigned Orders"
          description="Orders waiting for delivery progress."
        />

        <QuickLink
          href="/admin/orders?status=out_for_delivery"
          title="Out for Delivery"
          description="Orders currently with customers."
        />

        <QuickLink
          href="/admin/orders?status=delivered"
          title="Delivered Orders"
          description="Review completed deliveries."
        />

        <QuickLink
          href="/admin/delivery/areas"
          title="Delivery Areas"
          description="Manage delivery zones and fees."
        />
      </section>

      <div className="mt-8 border-t border-slate-200 pt-5">
        <p className="text-[11px] text-slate-400">
          Delivery status changes are performed through
          protected server actions. The admin interface
          does not bypass delivery-partner authorization
          or OTP validation.
        </p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function TimelineValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-xs font-semibold capitalize text-slate-700">
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <p className="text-sm font-bold text-slate-900">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </Link>
  );
}