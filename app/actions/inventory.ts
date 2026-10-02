'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const INVENTORY_ROLES = [
  'admin',
  'inventory_manager',
] as const;

const DirectionSchema = z.enum([
  'increase',
  'decrease',
]);

const ReasonCategorySchema = z.enum([
  'found',
  'correction',
  'damaged',
  'expired',
]);

const InventoryAdjustmentSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(1, 'A valid product is required.'),

  batchId: z
    .string()
    .trim()
    .min(1, 'Invalid batch.')
    .nullable()
    .optional(),

  quantity: z
    .number()
    .finite()
    .positive(
      'Quantity must be greater than zero.',
    ),

  direction: DirectionSchema,

  reasonCategory:
    ReasonCategorySchema,

  reason: z
    .string()
    .trim()
    .min(
      1,
      'A reason is required for every adjustment.',
    )
    .max(
      1000,
      'Reason is too long.',
    ),
});

type InventoryAdjustmentInput =
  z.infer<typeof InventoryAdjustmentSchema>;

export async function adjustInventory(
  input: InventoryAdjustmentInput,
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
    !INVENTORY_ROLES.includes(
      profile.role as (typeof INVENTORY_ROLES)[number],
    )
  ) {
    return {
      error:
        'You are not authorized to adjust inventory.',
    };
  }

  // --------------------------------------------------------------------------
  // Runtime validation
  // --------------------------------------------------------------------------

  const parsed =
    InventoryAdjustmentSchema.safeParse(
      input,
    );

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Please check the inventory adjustment details.',
    };
  }

  const value = parsed.data;

  // --------------------------------------------------------------------------
  // Atomic database operation
  //
  // The RPC performs:
  //   1. Authorization
  //   2. Product locking
  //   3. Stock validation
  //   4. Inventory update
  //   5. Product available_quantity update
  //   6. Inventory movement audit entry
  //
  // All operations occur inside one PostgreSQL transaction.
  // --------------------------------------------------------------------------

  const { error: rpcError } =
    await supabase.rpc(
      'manual_inventory_adjustment',
      {
        p_product_id:
          value.productId,

        p_batch_id:
          value.batchId?.trim() || null,

        p_quantity:
          value.quantity,

        p_direction:
          value.direction,

        p_reason_category:
          value.reasonCategory,

        p_reason:
          value.reason,
      },
    );

  if (rpcError) {
    console.error(
      '[INVENTORY] ADJUSTMENT RPC ERROR:',
      rpcError,
    );

    const message =
      rpcError.message || '';

    if (
      message.includes(
        'Insufficient stock',
      )
    ) {
      return {
        error:
          'Insufficient stock for this adjustment.',
      };
    }

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
        'Unauthorized',
      )
    ) {
      return {
        error:
          'You are not authorized to adjust inventory.',
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

    if (
      message.toLowerCase().includes(
        'reason',
      )
    ) {
      return {
        error:
          'A valid reason is required.',
      };
    }

    return {
      error:
        'Could not complete the inventory adjustment.',
    };
  }

  // --------------------------------------------------------------------------
  // Revalidate inventory UI
  // --------------------------------------------------------------------------

  revalidatePath(
    '/admin/inventory',
  );

  return {
    ok: true,
  };
}