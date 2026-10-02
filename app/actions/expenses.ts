'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const FINANCE_ROLES = ['admin', 'accountant'];

const ExpenseInputSchema = z.object({
  categoryId: z.string().trim().min(1, 'Expense category is required.'),
  name: z
    .string()
    .trim()
    .min(2, 'Expense name is required.')
    .max(200, 'Expense name is too long.'),
  amount: z
    .number()
    .finite()
    .nonnegative('Expense amount cannot be negative.'),
  expenseDate: z
    .string()
    .trim()
    .min(1, 'Expense date is required.'),
  vendor: z
    .string()
    .trim()
    .max(200, 'Vendor name is too long.')
    .optional(),
  paymentMethod: z
    .string()
    .trim()
    .max(100, 'Payment method is too long.')
    .optional(),
  notes: z
    .string()
    .trim()
    .max(1000, 'Notes are too long.')
    .optional(),
});

const UUIDSchema = z.string().uuid();

async function requireFinance() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    !profile ||
    profile.is_active !== true ||
    !FINANCE_ROLES.includes(profile.role)
  ) {
    return {
      error:
        'You are not authorized to do this.' as const,
    };
  }

  return {
    supabase,
    user,
  };
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

  const parsed = ExpenseInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Please check the expense details.',
    };
  }

  const value = parsed.data;

  const categoryIdResult =
    UUIDSchema.safeParse(value.categoryId);

  if (!categoryIdResult.success) {
    return {
      error: 'Invalid expense category.',
    };
  }

  const expenseDate = new Date(
    `${value.expenseDate}T00:00:00`,
  );

  if (Number.isNaN(expenseDate.getTime())) {
    return {
      error: 'Please provide a valid expense date.',
    };
  }

  const { error } = await supabase
    .from('expenses')
    .insert({
      category_id: value.categoryId,
      name: value.name,
      amount: value.amount,
      expense_date: value.expenseDate,
      vendor: value.vendor || null,
      payment_method:
        value.paymentMethod || null,
      notes: value.notes || null,
      created_by: user.id,
    });

  if (error) {
    console.error(
      '[expenses] create failed:',
      error.code,
      error.message,
    );

    return {
      error: 'Could not save this expense.',
    };
  }

  revalidatePath('/admin/expenses');

  return {
    ok: true,
  };
}

/**
 * Approval is a separate, explicit step.
 *
 * Only an authenticated active finance user can approve.
 * An already-approved expense is not silently overwritten.
 */
export async function approveExpense(
  expenseId: string,
) {
  const auth = await requireFinance();

  if ('error' in auth) return auth;

  const { supabase, user } = auth;

  const parsedId =
    UUIDSchema.safeParse(expenseId);

  if (!parsedId.success) {
    return {
      error: 'Expense not found.',
    };
  }

  const { data: expense, error: lookupError } =
    await supabase
      .from('expenses')
      .select('id, approved_by')
      .eq('id', expenseId)
      .maybeSingle();

  if (lookupError) {
    console.error(
      '[expenses] approval lookup failed:',
      lookupError.code,
      lookupError.message,
    );

    return {
      error: 'Could not approve this expense.',
    };
  }

  if (!expense) {
    return {
      error: 'Expense not found.',
    };
  }

  if (expense.approved_by) {
    return {
      error: 'This expense has already been approved.',
    };
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      approved_by: user.id,
    })
    .eq('id', expenseId)
    .is('approved_by', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error(
      '[expenses] approval update failed:',
      error.code,
      error.message,
    );

    return {
      error: 'Could not approve this expense.',
    };
  }

  if (!data) {
    return {
      error:
        'This expense was already approved or could not be found.',
    };
  }

  revalidatePath('/admin/expenses');

  return {
    ok: true,
  };
}