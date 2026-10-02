'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import type { CartItem } from '@/lib/types';

type PlaceOrderInput = {
  items: CartItem[];
  addressId: string;
  paymentMethod: 'upi_qr' | 'cod';
  deliveryDate?: string;
  deliverySlot?: string;
};

type AdminActionResult = {
  success?: boolean;
  error?: string;
};

/*
 * =========================================================
 * CUSTOMER: PLACE ORDER
 * =========================================================
 */

export async function placeOrder(
  input: PlaceOrderInput
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      '/auth/login?redirectTo=/checkout'
    );
  }

  if (
    !input.items ||
    input.items.length === 0
  ) {
    return {
      error: 'Your cart is empty.',
    };
  }

  /*
   * ---------------------------------------------------------
   * 1. NORMALIZE CART
   * ---------------------------------------------------------
   */

  const quantities = new Map<
    string,
    number
  >();

  for (const item of input.items) {
    const productId = String(
      item.productId ?? ''
    ).trim();

    const quantity = Number(
      item.quantity
    );

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return {
        error:
          'Invalid product quantity in your cart.',
      };
    }

    quantities.set(
      productId,
      (quantities.get(productId) ?? 0) +
        quantity
    );
  }

  const productIds = [
    ...quantities.keys(),
  ];

  /*
   * ---------------------------------------------------------
   * 2. LOAD PRODUCTS FROM DATABASE
   * ---------------------------------------------------------
   */

  const {
    data: products,
    error: productsError,
  } = await supabase
    .from('products')
    .select(`
      id,
      selling_price,
      gst_percent,
      is_active,
      delivery_available,
      available_quantity,
      min_order_quantity,
      max_order_quantity
    `)
    .in('id', productIds);

  if (
    productsError ||
    !products
  ) {
    console.error(
      'PRODUCT VALIDATION ERROR:',
      productsError
    );

    return {
      error:
        'Could not verify your cart. Please try again.',
    };
  }

  if (
    products.length !==
    productIds.length
  ) {
    return {
      error:
        'One or more products are no longer available.',
    };
  }

  /*
   * ---------------------------------------------------------
   * 3. VALIDATE PRODUCT + STOCK
   * ---------------------------------------------------------
   */

  for (const product of products) {
    const requestedQuantity =
      quantities.get(product.id) ?? 0;

    if (!product.is_active) {
      return {
        error:
          'One or more products are no longer available.',
      };
    }

    if (!product.delivery_available) {
      return {
        error:
          'One or more products are not available for delivery.',
      };
    }

    if (
      Number(
        product.available_quantity ?? 0
      ) < requestedQuantity
    ) {
      return {
        error: `Only ${product.available_quantity} unit(s) of this product are available.`,
      };
    }

    if (
      product.min_order_quantity !=
        null &&
      requestedQuantity <
        Number(
          product.min_order_quantity
        )
    ) {
      return {
        error: `Minimum order quantity is ${product.min_order_quantity}.`,
      };
    }

    if (
      product.max_order_quantity !=
        null &&
      requestedQuantity >
        Number(
          product.max_order_quantity
        )
    ) {
      return {
        error: `Maximum order quantity is ${product.max_order_quantity}.`,
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 4. BUILD ORDER ITEMS
   * ---------------------------------------------------------
   */

  let subtotal = 0;
  let tax = 0;

  const orderItemsPayload =
    products.map((product) => {
      const quantity =
        quantities.get(product.id) ??
        0;

      const unitPrice = Number(
        product.selling_price ?? 0
      );

      const lineTotal =
        unitPrice * quantity;

      const gstPercent = Number(
        product.gst_percent ?? 0
      );

      const lineTax =
        (lineTotal * gstPercent) /
        100;

      subtotal += lineTotal;
      tax += lineTax;

      return {
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        discount: 0,
        tax: lineTax,
        total:
          lineTotal + lineTax,
      };
    });

  /*
   * ---------------------------------------------------------
   * 5. VERIFY ADDRESS BELONGS TO CUSTOMER
   * ---------------------------------------------------------
   */

  const {
    data: address,
    error: addressError,
  } = await supabase
    .from('customer_addresses')
    .select(`
      id,
      village_city,
      pin_code
    `)
    .eq('id', input.addressId)
    .eq('customer_id', user.id)
    .single();

  if (
    addressError ||
    !address
  ) {
    return {
      error:
        'Please select a valid delivery address.',
    };
  }

  /*
   * ---------------------------------------------------------
   * 6. DELIVERY AREA
   * ---------------------------------------------------------
   */

  const {
    data: area,
    error: areaError,
  } = await supabase
    .from('delivery_areas')
    .select(`
      delivery_fee,
      free_delivery_above,
      is_active
    `)
    .ilike(
      'city_or_village',
      address.village_city
    )
    .maybeSingle();

  if (areaError) {
    console.error(
      'DELIVERY AREA ERROR:',
      areaError
    );
  }

  if (
    area &&
    area.is_active === false
  ) {
    return {
      error:
        'Delivery is not currently available in this area.',
    };
  }

  const deliveryFee =
    area?.free_delivery_above &&
    subtotal >=
      Number(
        area.free_delivery_above
      )
      ? 0
      : Number(
          area?.delivery_fee ?? 0
        );

  const total =
    subtotal +
    tax +
    deliveryFee;

  /*
   * ---------------------------------------------------------
   * 7. ORDER STATUS
   * ---------------------------------------------------------
   *
   * COD:
   *
   * placed
   *   ↓
   * Admin contacts customer
   *   ↓
   * confirmed
   *
   * UPI:
   *
   * payment_pending
   *   ↓
   * Customer payment
   *   ↓
   * payment verification
   *   ↓
   * confirmed
   */

  const orderStatus =
    input.paymentMethod === 'cod'
      ? 'placed'
      : 'payment_pending';

  /*
   * ---------------------------------------------------------
   * 8. CREATE ORDER
   * ---------------------------------------------------------
   */

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      delivery_address_id:
        input.addressId,

      subtotal,
      tax,
      delivery_fee:
        deliveryFee,
      total,

      payment_method:
        input.paymentMethod,

      payment_status: 'pending',

      order_status:
        orderStatus,

      delivery_date:
        input.deliveryDate || null,

      delivery_slot:
        input.deliverySlot || null,
    })
    .select(`
      id,
      order_number
    `)
    .single();

  if (
    orderError ||
    !order
  ) {
    console.error(
      'ORDER INSERT ERROR:',
      orderError
    );

    return {
      error:
        'Your order could not be placed. Please try again.',
    };
  }

  /*
   * ---------------------------------------------------------
   * 9. CREATE ORDER ITEMS
   * ---------------------------------------------------------
   */

  const {
    error: itemsError,
  } = await supabase
    .from('order_items')
    .insert(
      orderItemsPayload.map(
        (item) => ({
          ...item,
          order_id: order.id,
        })
      )
    );

  if (itemsError) {
    console.error(
      'ORDER ITEMS INSERT ERROR:',
      itemsError
    );

    await supabase
      .from('orders')
      .update({
        order_status:
          'cancelled',
      })
      .eq(
        'id',
        order.id
      );

    return {
      error:
        'Your order could not be completed. Please try again.',
    };
  }

  /*
   * ---------------------------------------------------------
   * 10. PAYMENT RECORD
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * Never mark payment as "paid" here.
   */

  const {
    error: paymentError,
  } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      customer_id: user.id,
      amount: total,
      payment_method:
        input.paymentMethod,
      status: 'pending',
    });

  if (paymentError) {
    console.error(
      'PAYMENT RECORD ERROR:',
      paymentError
    );
  }

  /*
   * ---------------------------------------------------------
   * 11. REDIRECT
   * ---------------------------------------------------------
   */

  if (
    input.paymentMethod ===
    'upi_qr'
  ) {
    redirect(
      `/checkout/payment/${order.id}`
    );
  }

  redirect(
    `/dashboard/orders/${order.id}?placed=1`
  );
}

/*
 * =========================================================
 * ADMIN ORDER ACCESS
 * =========================================================
 */

const ADMIN_ORDER_ROLES = [
  'admin',
  'sales_manager',
  'customer_support',
];

async function requireAdminOrderAccess() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      supabase,
      user: null,
      error:
        'You must be logged in.',
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      is_active
    `)
    .eq(
      'id',
      user.id
    )
    .single();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      'ADMIN ORDER PROFILE ERROR:',
      profileError
    );

    return {
      supabase,
      user,
      error:
        'Your staff profile could not be verified.',
    };
  }

  if (!profile.is_active) {
    return {
      supabase,
      user,
      error:
        'Your account is inactive.',
    };
  }

  if (
    !ADMIN_ORDER_ROLES.includes(
      String(profile.role)
    )
  ) {
    return {
      supabase,
      user,
      error:
        'You do not have permission to manage orders.',
    };
  }

  return {
    supabase,
    user,
    error: null,
  };
}

/*
 * =========================================================
 * ADMIN: CONFIRM COD ORDER
 * =========================================================
 */

export async function confirmAdminOrder(
  orderId: string
): Promise<AdminActionResult> {
  const access =
    await requireAdminOrderAccess();

  if (access.error) {
    return {
      error: access.error,
    };
  }

  const { supabase } =
    access;

  const cleanOrderId =
    String(orderId ?? '').trim();

  if (!cleanOrderId) {
    return {
      error:
        'Invalid order ID.',
    };
  }

  const {
    data: order,
    error: fetchError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_status,
      payment_status,
      payment_method
    `)
    .eq(
      'id',
      cleanOrderId
    )
    .single();

  if (
    fetchError ||
    !order
  ) {
    console.error(
      'CONFIRM ORDER FETCH ERROR:',
      fetchError
    );

    return {
      error:
        'Order could not be found.',
    };
  }

  /*
   * Only COD orders waiting for
   * customer confirmation.
   */

  if (
    order.order_status !==
    'placed'
  ) {
    return {
      error:
        `This order cannot be confirmed because its current status is "${String(
          order.order_status
        ).replace(/_/g, ' ')}".`,
    };
  }

  if (
    order.payment_method !==
    'cod'
  ) {
    return {
      error:
        'Only COD orders can be confirmed using this action.',
    };
  }

  /*
   * Conditional update prevents
   * two admins from confirming
   * the same order simultaneously.
   */

  const {
    data: updatedOrder,
    error: updateError,
  } = await supabase
    .from('orders')
    .update({
      order_status:
        'confirmed',
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      cleanOrderId
    )
    .eq(
      'order_status',
      'placed'
    )
    .select('id')
    .maybeSingle();

  if (
    updateError ||
    !updatedOrder
  ) {
    console.error(
      'CONFIRM ORDER UPDATE ERROR:',
      updateError
    );

    return {
      error:
        'Order could not be confirmed. It may have already been updated.',
    };
  }

  revalidatePath(
    '/admin/orders'
  );

  revalidatePath(
    '/admin/dashboard'
  );

  revalidatePath(
    `/admin/orders/${cleanOrderId}`
  );

  revalidatePath(
    `/dashboard/orders/${cleanOrderId}`
  );

  return {
    success: true,
  };
}

/*
 * =========================================================
 * ADMIN: CANCEL ORDER
 * =========================================================
 */

export async function cancelAdminOrder(
  orderId: string,
  reason: string
): Promise<AdminActionResult> {
  const access =
    await requireAdminOrderAccess();

  if (access.error) {
    return {
      error: access.error,
    };
  }

  const { supabase } =
    access;

  const cleanOrderId =
    String(orderId ?? '').trim();

  const cleanReason =
    String(reason ?? '').trim();

  if (!cleanOrderId) {
    return {
      error:
        'Invalid order ID.',
    };
  }

  if (!cleanReason) {
    return {
      error:
        'Please enter a cancellation reason.',
    };
  }

  if (
    cleanReason.length > 500
  ) {
    return {
      error:
        'Cancellation reason must be 500 characters or less.',
    };
  }

  const {
    data: order,
    error: fetchError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_status
    `)
    .eq(
      'id',
      cleanOrderId
    )
    .single();

  if (
    fetchError ||
    !order
  ) {
    console.error(
      'CANCEL ORDER FETCH ERROR:',
      fetchError
    );

    return {
      error:
        'Order could not be found.',
    };
  }

  const protectedStatuses = [
    'cancelled',
    'delivered',
    'refunded',
  ];

  if (
    protectedStatuses.includes(
      String(order.order_status)
    )
  ) {
    return {
      error:
        `This order cannot be cancelled because its current status is "${String(
          order.order_status
        ).replace(/_/g, ' ')}".`,
    };
  }

  /*
   * IMPORTANT:
   *
   * We intentionally do not DELETE
   * the order.
   *
   * Cancelled orders must remain
   * available for business history,
   * reporting and audit purposes.
   */

  const {
    data: updatedOrder,
    error: updateError,
  } = await supabase
    .from('orders')
    .update({
      order_status:
        'cancelled',
      updated_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      cleanOrderId
    )
    .not(
      'order_status',
      'in',
      '(cancelled,delivered,refunded)'
    )
    .select('id')
    .maybeSingle();

  if (
    updateError ||
    !updatedOrder
  ) {
    console.error(
      'CANCEL ORDER UPDATE ERROR:',
      updateError
    );

    return {
      error:
        'Order could not be cancelled. It may have already been updated.',
    };
  }

  /*
   * Your supplied orders table does not
   * contain cancellation_reason.
   *
   * Therefore we do not try to write the
   * reason into a nonexistent column.
   */

  revalidatePath(
    '/admin/orders'
  );

  revalidatePath(
    '/admin/dashboard'
  );

  revalidatePath(
    `/admin/orders/${cleanOrderId}`
  );

  revalidatePath(
    `/dashboard/orders/${cleanOrderId}`
  );

  return {
    success: true,
  };
}

/*
 * =========================================================
 * ADMIN: GET ORDER DETAILS
 * =========================================================
 */

export async function getAdminOrderDetails(
  orderId: string
) {
  const access =
    await requireAdminOrderAccess();

  if (access.error) {
    return {
      error: access.error,
    };
  }

  const { supabase } =
    access;

  const cleanOrderId =
    String(orderId ?? '').trim();

  if (!cleanOrderId) {
    return {
      error:
        'Invalid order ID.',
    };
  }

  /*
   * ---------------------------------------------------------
   * ORDER + CUSTOMER + ADDRESS
   * ---------------------------------------------------------
   */

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_id,
      delivery_address_id,
      subtotal,
      discount,
      delivery_fee,
      tax,
      total,
      payment_status,
      order_status,
      delivery_status,
      payment_method,
      delivery_date,
      delivery_slot,
      delivery_partner_id,
      created_at,
      updated_at,

      profiles!orders_customer_id_fkey (
        id,
        full_name,
        mobile,
        email
      ),

      customer_addresses!orders_delivery_address_id_fkey (
        id,
        label,
        recipient_name,
        phone,
        address_line,
        address_line_2,
        village_city,
        taluka,
        district,
        pin_code,
        landmark,
        delivery_instructions,
        state,
        formatted_address
      )
    `)
    .eq(
      'id',
      cleanOrderId
    )
    .single();

  if (
    orderError ||
    !order
  ) {
    console.error(
      'ADMIN ORDER DETAILS ERROR:',
      orderError
    );

    return {
      error:
        'Order could not be found.',
    };
  }

  /*
   * ---------------------------------------------------------
   * ORDER ITEMS
   * ---------------------------------------------------------
   */

  const {
    data: items,
    error: itemsError,
  } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      unit_price,
      discount,
      tax,
      total,

      products (
        id,
        name,
        name_marathi,
        unit,
        net_quantity,
        image_url
      )
    `)
    .eq(
      'order_id',
      cleanOrderId
    );

  if (itemsError) {
    console.error(
      'ADMIN ORDER ITEMS ERROR:',
      itemsError
    );
  }

  /*
   * ---------------------------------------------------------
   * PAYMENT
   * ---------------------------------------------------------
   */

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from('payments')
    .select(`
      id,
      order_id,
      amount,
      payment_method,
      status,
      transaction_id,
      provider_reference,
      verified_at,
      paid_at,
      created_at
    `)
    .eq(
      'order_id',
      cleanOrderId
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(1);

  if (paymentsError) {
    console.error(
      'ADMIN ORDER PAYMENT ERROR:',
      paymentsError
    );
  }

  return {
    order,
    items: items ?? [],
    payment:
      payments?.[0] ?? null,
  };
}