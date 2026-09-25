'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { CartItem } from '@/lib/types';

type PlaceOrderInput = {
  items: CartItem[];
  addressId: string;
  paymentMethod: 'upi_qr' | 'cod';
  deliveryDate?: string;
  deliverySlot?: string;
};

/**
 * Creates an order + order_items from the client-side cart, computes the
 * delivery fee from the address's delivery area, and creates a matching
 * `payments` row. For COD, the order goes straight to `confirmed`. For
 * UPI QR, it stays `payment_pending` until the customer submits proof of
 * payment and (eventually) an Admin/gateway verifies it — see
 * app/actions/payments.ts.
 */
export async function placeOrder(input: PlaceOrderInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/checkout');

  if (input.items.length === 0) {
    return { error: 'Your cart is empty.' };
  }

  // Re-price server-side from the DB — never trust client-supplied prices.
  const productIds = input.items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, selling_price, gst_percent, is_active, delivery_available, available_quantity')
    .in('id', productIds);

  if (productsError || !products) {
    return { error: 'Could not verify your cart. Please try again.' };
  }

  const unavailable = products.find(
    (p) => !p.is_active || !p.delivery_available || p.available_quantity <= 0
  );
  if (unavailable) {
    return { error: 'One or more items in your cart are no longer available.' };
  }

  let subtotal = 0;
  let tax = 0;
  const orderItemsPayload = input.items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const lineTotal = product.selling_price * item.quantity;
    const lineTax = (lineTotal * (product.gst_percent ?? 0)) / 100;
    subtotal += lineTotal;
    tax += lineTax;
    return {
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: product.selling_price,
      discount: 0,
      tax: lineTax,
      total: lineTotal + lineTax,
    };
  });

  // Delivery fee: look up the customer's chosen address -> village/city ->
  // matching delivery_areas row for its fee + free-delivery threshold.
  const { data: address } = await supabase
    .from('customer_addresses')
    .select('village_city, pin_code')
    .eq('id', input.addressId)
    .single();

  const { data: area } = await supabase
    .from('delivery_areas')
    .select('delivery_fee, free_delivery_above, is_active')
    .ilike('city_or_village', address?.village_city ?? '')
    .maybeSingle();

  if (area && area.is_active === false) {
    return { error: 'Delivery is not currently available in this area.' };
  }

  const deliveryFee =
    area?.free_delivery_above && subtotal >= area.free_delivery_above
      ? 0
      : area?.delivery_fee ?? 0;

  const total = subtotal + tax + deliveryFee;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      delivery_address_id: input.addressId,
      subtotal,
      tax,
      delivery_fee: deliveryFee,
      total,
      payment_method: input.paymentMethod,
      payment_status: 'pending',
      order_status: input.paymentMethod === 'cod' ? 'confirmed' : 'payment_pending',
      delivery_date: input.deliveryDate || null,
      delivery_slot: input.deliverySlot || null,
    })
    .select('id, order_number')
    .single();

  if (orderError || !order) {
    return { error: 'Your order could not be placed. Please try again.' };
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload.map((i) => ({ ...i, order_id: order.id })));

  if (itemsError) {
    return { error: 'Your order could not be placed. Please try again.' };
  }

  // Payment record — 'paid' only ever set by an Admin/gateway, never here.
  await supabase.from('payments').insert({
    order_id: order.id,
    customer_id: user.id,
    amount: total,
    payment_method: input.paymentMethod,
    status: input.paymentMethod === 'cod' ? 'pending' : 'payment_initiated',
  });

  // Packing task is created automatically by a DB trigger once the order
  // reaches 'confirmed' (immediately for COD; after payment verification
  // for UPI QR) — see supabase/05_functions.sql.

  if (input.paymentMethod === 'upi_qr') {
    redirect(`/checkout/payment/${order.id}`);
  }

  redirect(`/dashboard/orders/${order.id}?placed=1`);
}
