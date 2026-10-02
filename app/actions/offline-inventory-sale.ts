'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const OfflineSaleInputSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'A valid product is required.'),

  batchId: z
    .string()
    .trim()
    .min(1, 'Invalid batch.')
    .nullable(),

  quantity: z
    .number()
    .finite()
    .positive(
      'Quantity must be greater than zero.',
    ),

  reference: z
    .string()
    .trim()
    .max(
      500,
      'Reference is too long.',
    )
    .optional(),
});

type OfflineSaleInput =
  z.infer<typeof OfflineSaleInputSchema>;

export async function recordOfflineSale(
  input: OfflineSaleInput,
) {
  const supabase = createClient();

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.',
    };
  }

  // --------------------------------------------------------------------------
  // Active user + role authorization
  // --------------------------------------------------------------------------

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    ![
      'admin',
      'inventory_manager',
    ].includes(profile.role)
  ) {
    return {
      error:
        'You are not authorized to record offline sales.',
    };
  }

  // --------------------------------------------------------------------------
  // Runtime validation
  // --------------------------------------------------------------------------

  const parsed =
    OfflineSaleInputSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Please check the offline sale details.',
    };
  }

  const value = parsed.data;

  // --------------------------------------------------------------------------
  // Atomic database operation
  //
  // The database RPC remains responsible for the actual
  // inventory transaction and stock changes.
  // --------------------------------------------------------------------------

  const { error } =
    await supabase.rpc(
      'record_offline_inventory_sale',
      {
        p_product_id:
          value.productId,

        p_batch_id:
          value.batchId,

        p_quantity:
          value.quantity,

        p_reference:
          value.reference || null,
      },
    );

  if (error) {
    console.error(
      '[OFFLINE INVENTORY SALE] RPC ERROR:',
      error,
    );

    const message =
      error.message || '';

    if (
      message.includes(
        'Product not found',
      )
    ) {
      return {
        error:
          'Product not found.',
      };
    }

    if (
      message.includes(
        'Batch not found',
      )
    ) {
      return {
        error:
          'Batch not found.',
      };
    }

    if (
      message.includes(
        'Insufficient stock',
      )
    ) {
      return {
        error:
          'Insufficient stock for this sale.',
      };
    }

    if (
      message.includes(
        'Quantity must be greater',
      )
    ) {
      return {
        error:
          'Quantity must be greater than zero.',
      };
    }

    return {
      error:
        message ||
        'Could not record the offline sale. No stock was changed.',
    };
  }

  // --------------------------------------------------------------------------
  // Revalidate inventory-related UI
  // --------------------------------------------------------------------------

  revalidatePath(
    '/admin/inventory',
  );

  revalidatePath(
    '/admin/products',
  );

  revalidatePath(
    '/admin/production/batches',
  );

  revalidatePath(
    '/admin/traceability',
  );

  return {
    ok: true,
  };
}