'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const FINANCE_ROLES = ['admin', 'accountant'];

async function requireFinance() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !FINANCE_ROLES.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase, user };
}

export async function createExpense(input: {
  categoryId: string;
  name: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  paymentMethod?: string;
  notes?: string;
}) {
  const auth = await requireFinance();
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { error } = await supabase.from('expenses').insert({
    category_id: input.categoryId,
    name: input.name,
    amount: input.amount,
    expense_date: input.expenseDate,
    vendor: input.vendor || null,
    payment_method: input.paymentMethod || null,
    notes: input.notes || null,
    created_by: user.id,
  });
  if (error) return { error: 'Could not save this expense.' };

  revalidatePath('/admin/expenses');
  return { ok: true };
}

/** Approval is a separate, explicit step — an expense someone entered
 * isn't automatically treated as sanctioned (§53). */
export async function approveExpense(expenseId: string) {
  const auth = await requireFinance();
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { error } = await supabase
    .from('expenses')
    .update({ approved_by: user.id })
    .eq('id', expenseId);
  if (error) return { error: 'Could not approve this expense.' };

  revalidatePath('/admin/expenses');
  return { ok: true };
}
