'use server';

import {
  createClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';

const PRODUCT_DEMAND_ROLES = [
  'admin',
  'sales_manager',
  'customer_support',
  'accountant',
  'inventory_manager',
  'production_manager',
] as const;

export type ProductDemandRow = {
  product_id: string;
  quantity: number;
  order_count: number;
};

export async function getProductDemand(
  days = 30,
): Promise<{
  rows: ProductDemandRow[];
  error?: string;
}> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      rows: [],
      error: 'Please sign in again.',
    };
  }

  // --------------------------------------------------------------------------
  // Active staff authorization
  // --------------------------------------------------------------------------

  const { data: profile } =
    await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

  if (
    !profile ||
    profile.is_active !== true ||
    !PRODUCT_DEMAND_ROLES.includes(
      profile.role as (typeof PRODUCT_DEMAND_ROLES)[number],
    )
  ) {
    return {
      rows: [],
      error:
        'You are not authorized to view product demand.',
    };
  }

  // --------------------------------------------------------------------------
  // Runtime range validation
  // --------------------------------------------------------------------------

  const numericDays =
    Number(days);

  if (
    !Number.isFinite(numericDays)
  ) {
    return {
      rows: [],
      error:
        'Invalid demand period.',
    };
  }

  const safeDays = Math.min(
    Math.max(
      Math.floor(numericDays),
      1,
    ),
    365,
  );

  const since = new Date(
    Date.now() -
      safeDays *
        24 *
        60 *
        60 *
        1000,
  ).toISOString();

  // --------------------------------------------------------------------------
  // Demand is read through the service client only after the authenticated
  // active-staff-role check above. This keeps order history out of the browser.
  // --------------------------------------------------------------------------

  const service =
    createServiceRoleClient();

  const {
    data: orders,
    error: ordersError,
  } = await service
    .from('orders')
    .select('id')
    .gte(
      'created_at',
      since,
    )
    .not(
      'order_status',
      'in',
      '(cancelled,rejected,refund_requested,refunded)',
    );

  if (ordersError) {
    console.error(
      'PRODUCT DEMAND ORDERS ERROR:',
      ordersError,
    );

    return {
      rows: [],
      error:
        'Could not load product demand.',
    };
  }

  const orderIds =
    (orders ?? []).map(
      (row) => row.id,
    );

  if (orderIds.length === 0) {
    return {
      rows: [],
    };
  }

  // --------------------------------------------------------------------------
  // Load order items for the eligible orders
  // --------------------------------------------------------------------------

  const {
    data: items,
    error: itemsError,
  } = await service
    .from('order_items')
    .select(
      'product_id, quantity, order_id',
    )
    .in(
      'order_id',
      orderIds,
    );

  if (itemsError) {
    console.error(
      'PRODUCT DEMAND ITEMS ERROR:',
      itemsError,
    );

    return {
      rows: [],
      error:
        'Could not load product demand.',
    };
  }

  // --------------------------------------------------------------------------
  // Aggregate demand by product
  // --------------------------------------------------------------------------

  const map = new Map<
    string,
    {
      quantity: number;
      orders: Set<string>;
    }
  >();

  for (const item of items ?? []) {
    const productId =
      String(
        item.product_id ?? '',
      ).trim();

    const quantity =
      Number(
        item.quantity ?? 0,
      );

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      continue;
    }

    const current =
      map.get(productId) ?? {
        quantity: 0,
        orders:
          new Set<string>(),
      };

    current.quantity +=
      quantity;

    if (item.order_id) {
      current.orders.add(
        String(
          item.order_id,
        ),
      );
    }

    map.set(
      productId,
      current,
    );
  }

  // --------------------------------------------------------------------------
  // Return highest-demand products first
  // --------------------------------------------------------------------------

  return {
    rows: Array.from(
      map.entries(),
    )
      .map(
        ([product_id, value]) => ({
          product_id,
          quantity:
            value.quantity,
          order_count:
            value.orders.size,
        }),
      )
      .sort((a, b) => {
        if (
          b.quantity !==
          a.quantity
        ) {
          return (
            b.quantity -
            a.quantity
          );
        }

        return (
          b.order_count -
          a.order_count
        );
      }),
  };
}