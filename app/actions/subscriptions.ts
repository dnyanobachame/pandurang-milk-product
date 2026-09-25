'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

type CreateSubscriptionInput = {
  productId: string;
  quantity: number;
  frequency: string;
  addressId: string;
  paymentMethod: 'upi_qr' | 'cod';
  startDate: string;
};

export async function createSubscription(input: CreateSubscriptionInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/dashboard/subscriptions/new');

  const { error } = await supabase.from('subscriptions').insert({
    customer_id: user.id,
    product_id: input.productId,
    quantity: input.quantity,
    frequency: input.frequency,
    delivery_address_id: input.addressId,
    payment_method: input.paymentMethod,
    start_date: input.startDate,
  });

  if (error) return { error: 'Could not create your subscription. Please try again.' };

  revalidatePath('/dashboard/subscriptions');
  redirect('/dashboard/subscriptions');
}

async function updateOwnSubscription(subscriptionId: string, patch: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { error } = await supabase
    .from('subscriptions')
    .update(patch)
    .eq('id', subscriptionId)
    .eq('customer_id', user.id);

  if (error) return { error: 'Could not update your subscription.' };
  revalidatePath('/dashboard/subscriptions');
  return { ok: true };
}

export const pauseSubscription = (id: string) => updateOwnSubscription(id, { is_paused: true });
export const resumeSubscription = (id: string) => updateOwnSubscription(id, { is_paused: false });
export const cancelSubscription = (id: string) =>
  updateOwnSubscription(id, { is_active: false, is_paused: false });
