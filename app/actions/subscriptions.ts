
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const CreateSubscriptionSchema = z.object({
  productId: z.string().uuid('Invalid product.'),
  quantity: z
    .number()
    .finite()
    .positive('Quantity must be greater than zero.')
    .max(1000, 'Quantity is too high.'),
  frequency: z
    .string()
    .trim()
    .min(1, 'Frequency is required.')
    .max(50, 'Invalid frequency.'),
  addressId: z.string().uuid('Invalid delivery address.'),
  paymentMethod: z.enum(['upi_qr', 'cod']),
  startDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Invalid start date.'
    ),
});

const SubscriptionIdSchema = z.string().uuid(
  'Invalid subscription.'
);

type CreateSubscriptionInput = {
  productId: string;
  quantity: number;
  frequency: string;
  addressId: string;
  paymentMethod: 'upi_qr' | 'cod';
  startDate: string;
};

function isValidCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export async function createSubscription(
  input: CreateSubscriptionInput
) {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      '/auth/login?redirectTo=/dashboard/subscriptions/new'
    );
  }

  const parsed =
    CreateSubscriptionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid subscription details.',
    };
  }

  const {
    productId,
    quantity,
    frequency,
    addressId,
    paymentMethod,
    startDate,
  } = parsed.data;

  if (!isValidCalendarDate(startDate)) {
    return {
      error: 'Please select a valid start date.',
    };
  }

  /**
   * Verify the product exists and is currently active.
   *
   * Do not trust the product ID or availability supplied
   * by the browser.
   */
  const {
    data: product,
    error: productError,
  } = await supabase
    .from('products')
    .select(
      'id, is_active, available_quantity, min_order_quantity, max_order_quantity'
    )
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    console.error(
      '[subscription] product lookup failed:',
      productError.message
    );

    return {
      error:
        'Could not verify the selected product.',
    };
  }

  if (!product) {
    return {
      error: 'The selected product was not found.',
    };
  }

  if (product.is_active !== true) {
    return {
      error:
        'This product is currently unavailable.',
    };
  }

  /**
   * Respect product-level order quantity limits
   * when they are configured.
   */
  if (
    product.min_order_quantity !== null &&
    quantity < Number(product.min_order_quantity)
  ) {
    return {
      error:
        `Minimum quantity is ${product.min_order_quantity}.`,
    };
  }

  if (
    product.max_order_quantity !== null &&
    quantity > Number(product.max_order_quantity)
  ) {
    return {
      error:
        `Maximum quantity is ${product.max_order_quantity}.`,
    };
  }

  /**
   * Verify that the address belongs to this customer.
   *
   * Never accept an arbitrary address ID from the client.
   */
  const {
    data: address,
    error: addressError,
  } = await supabase
    .from('addresses')
    .select('id')
    .eq('id', addressId)
    .eq('customer_id', user.id)
    .maybeSingle();

  if (addressError) {
    console.error(
      '[subscription] address lookup failed:',
      addressError.message
    );

    return {
      error:
        'Could not verify the selected delivery address.',
    };
  }

  if (!address) {
    return {
      error:
        'The selected delivery address is invalid.',
    };
  }

  /**
   * Re-check the product stock.
   *
   * Subscriptions are recurring, so this does not reserve
   * the entire future quantity. It only prevents creating
   * obviously invalid subscriptions when the current product
   * is unavailable.
   */
  if (
    product.available_quantity !== null &&
    Number(product.available_quantity) < quantity
  ) {
    return {
      error:
        'The selected product does not currently have enough stock.',
    };
  }

  const { error: insertError } =
    await supabase
      .from('subscriptions')
      .insert({
        customer_id: user.id,
        product_id: productId,
        quantity,
        frequency,
        delivery_address_id: addressId,
        payment_method: paymentMethod,
        start_date: startDate,
      });

  if (insertError) {
    console.error(
      '[subscription] create failed:',
      insertError.message
    );

    return {
      error:
        'Could not create your subscription. Please try again.',
    };
  }

  revalidatePath(
    '/dashboard/subscriptions'
  );

  redirect(
    '/dashboard/subscriptions'
  );
}

async function updateOwnSubscription(
  subscriptionId: string,
  patch: Record<string, unknown>
) {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: 'Please sign in again.',
    };
  }

  const parsedId =
    SubscriptionIdSchema.safeParse(
      String(subscriptionId ?? '').trim()
    );

  if (!parsedId.success) {
    return {
      error: 'Invalid subscription.',
    };
  }

  /**
   * First verify ownership and current existence.
   */
  const {
    data: subscription,
    error: subscriptionError,
  } =
    await supabase
      .from('subscriptions')
      .select(
        'id, customer_id, is_active, is_paused'
      )
      .eq('id', parsedId.data)
      .eq('customer_id', user.id)
      .maybeSingle();

  if (subscriptionError) {
    console.error(
      '[subscription] lookup failed:',
      subscriptionError.message
    );

    return {
      error:
        'Could not load your subscription.',
    };
  }

  if (!subscription) {
    return {
      error:
        'Subscription not found or you do not have access to it.',
    };
  }

  /**
   * Avoid unnecessary writes.
   */
  if (
    'is_paused' in patch &&
    patch.is_paused ===
      subscription.is_paused &&
    !('is_active' in patch)
  ) {
    return {
      ok: true,
    };
  }

  if (
    'is_active' in patch &&
    patch.is_active ===
      subscription.is_active &&
    !('is_paused' in patch)
  ) {
    return {
      ok: true,
    };
  }

  /**
   * Do not allow an already-cancelled subscription
   * to be resumed or paused.
   */
  if (
    subscription.is_active === false &&
    'is_paused' in patch
  ) {
    return {
      error:
        'This subscription has already been cancelled.',
    };
  }

  /**
   * Ownership remains part of the UPDATE itself.
   * This protects against TOCTOU-style changes between
   * the verification query and the update.
   */
  let query = supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', parsedId.data)
    .eq('customer_id', user.id);

  if (
    'is_paused' in patch
  ) {
    query = query.eq(
      'is_paused',
      subscription.is_paused
    );
  }

  if (
    'is_active' in patch
  ) {
    query = query.eq(
      'is_active',
      subscription.is_active
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await query
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      '[subscription] update failed:',
      updateError.message
    );

    return {
      error:
        'Could not update your subscription.',
    };
  }

  if (!updated) {
    return {
      error:
        'The subscription changed before this request completed. Please refresh and try again.',
    };
  }

  revalidatePath(
    '/dashboard/subscriptions'
  );

  revalidatePath(
    `/dashboard/subscriptions/${parsedId.data}`
  );

  return {
    ok: true,
  };
}

export const pauseSubscription = (
  id: string
) =>
  updateOwnSubscription(
    id,
    {
      is_paused: true,
    }
  );

export const resumeSubscription = (
  id: string
) =>
  updateOwnSubscription(
    id,
    {
      is_paused: false,
    }
  );

export const cancelSubscription = (
  id: string
) =>
  updateOwnSubscription(
    id,
    {
      is_active: false,
      is_paused: false,
    }
  );
