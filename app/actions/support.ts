'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

function generateTicketNumber() {
  return `TKT-${Date.now().toString(36).toUpperCase()}`;
}

export async function createSupportTicket(input: {
  orderId?: string;
  category: string;
  description: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  if (!input.description.trim()) return { error: 'Please describe the issue.' };

  const { error } = await supabase.from('support_tickets').insert({
    ticket_number: generateTicketNumber(),
    customer_id: user.id,
    order_id: input.orderId || null,
    category: input.category,
    description: input.description,
    status: 'open',
  });

  if (error) return { error: 'Could not submit your request. Please try again.' };

  revalidatePath('/dashboard/support');
  redirect('/dashboard/support');
}

const SUPPORT_ROLES = ['admin', 'customer_support'];

export async function resolveTicket(ticketId: string, resolution: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !SUPPORT_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' };
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({ status: 'resolved', resolution, assigned_to: user.id })
    .eq('id', ticketId);

  if (error) return { error: 'Could not resolve this ticket.' };

  revalidatePath('/admin/support');
  return { ok: true };
}
