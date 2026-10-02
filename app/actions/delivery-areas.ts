'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const DELIVERY_ROLES = [
  'admin',
  'delivery_manager',
] as const;

const uuidSchema = z.string().uuid();

const nonNegativeNumberSchema = z
  .number()
  .finite()
  .min(0);

function validateAreaId(areaId: string) {
  const parsed = uuidSchema.safeParse(
    String(areaId ?? '').trim(),
  );

  return parsed.success ? parsed.data : null;
}

function validateNonNegativeNumber(
  value: number,
) {
  return nonNegativeNumberSchema.safeParse(value)
    .success;
}

/**
 * Require an authenticated ACTIVE delivery manager/admin.
 *
 * This is a server-side authorization check.
 * UI restrictions are not considered security.
 */
async function requireDeliveryManager() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

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
    !DELIVERY_ROLES.includes(
      profile.role as (typeof DELIVERY_ROLES)[number],
    )
  ) {
    return {
      error:
        'You are not authorized to do this.' as const,
    };
  }

  return {
    supabase,
    user,
    role: profile.role,
  };
}

function refreshDeliveryAreas() {
  revalidatePath('/admin/delivery/areas');
  revalidatePath('/checkout');
}

// ============================================================================
// CREATE DELIVERY AREA
// ============================================================================

export async function createDeliveryArea(input: {
  cityOrVillage: string;
  pinCode?: string;
  deliveryFee: number;
  freeDeliveryAbove?: number;
  minOrderAmount?: number;
}) {
  const auth =
    await requireDeliveryManager();

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  const cityOrVillage =
    String(input.cityOrVillage ?? '').trim();

  if (!cityOrVillage) {
    return {
      error: 'City or village is required.',
    };
  }

  if (cityOrVillage.length > 150) {
    return {
      error:
        'City or village name is too long.',
    };
  }

  const pinCode =
    String(input.pinCode ?? '').trim() || null;

  if (
    pinCode &&
    !/^\d{6}$/.test(pinCode)
  ) {
    return {
      error:
        'PIN code must contain exactly 6 digits.',
    };
  }

  if (
    !validateNonNegativeNumber(
      input.deliveryFee,
    )
  ) {
    return {
      error:
        'Delivery fee must be zero or greater.',
    };
  }

  const freeDeliveryAbove =
    input.freeDeliveryAbove ?? null;

  if (
    freeDeliveryAbove !== null &&
    !validateNonNegativeNumber(
      freeDeliveryAbove,
    )
  ) {
    return {
      error:
        'Free delivery threshold must be zero or greater.',
    };
  }

  const minOrderAmount =
    input.minOrderAmount ?? 0;

  if (
    !validateNonNegativeNumber(
      minOrderAmount,
    )
  ) {
    return {
      error:
        'Minimum order amount must be zero or greater.',
    };
  }

  const { error } = await supabase
    .from('delivery_areas')
    .insert({
      city_or_village: cityOrVillage,
      pin_code: pinCode,
      delivery_fee: input.deliveryFee,
      free_delivery_above:
        freeDeliveryAbove,
      min_order_amount: minOrderAmount,
      is_active: true,
    });

  if (error) {
    console.error(
      '[DELIVERY AREA] CREATE ERROR:',
      error,
    );

    return {
      error:
        'Could not save this delivery area.',
    };
  }

  refreshDeliveryAreas();

  return {
    ok: true,
  };
}

// ============================================================================
// TOGGLE DELIVERY AREA ACTIVE STATUS
// ============================================================================

export async function toggleAreaActive(
  areaId: string,
  isActive: boolean,
) {
  const auth =
    await requireDeliveryManager();

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  const cleanAreaId =
    validateAreaId(areaId);

  if (!cleanAreaId) {
    return {
      error: 'Invalid delivery area.',
    };
  }

  if (typeof isActive !== 'boolean') {
    return {
      error: 'Invalid active status.',
    };
  }

  const {
    data: area,
    error: areaLookupError,
  } = await supabase
    .from('delivery_areas')
    .select('id, is_active')
    .eq('id', cleanAreaId)
    .maybeSingle();

  if (areaLookupError) {
    console.error(
      '[DELIVERY AREA] LOOKUP ERROR:',
      areaLookupError,
    );

    return {
      error:
        'Could not find this delivery area.',
    };
  }

  if (!area) {
    return {
      error: 'Delivery area not found.',
    };
  }

  if (area.is_active === isActive) {
    return {
      ok: true,
    };
  }

  /*
   * Conditional update prevents an outdated request
   * from overwriting a newer active/inactive state.
   */
  const {
    data: updatedArea,
    error: updateError,
  } = await supabase
    .from('delivery_areas')
    .update({
      is_active: isActive,
    })
    .eq('id', cleanAreaId)
    .eq('is_active', area.is_active)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      '[DELIVERY AREA] ACTIVE STATUS UPDATE ERROR:',
      updateError,
    );

    return {
      error:
        'Could not update this area.',
    };
  }

  if (!updatedArea) {
    return {
      error:
        'This delivery area was already updated. Please refresh and try again.',
    };
  }

  refreshDeliveryAreas();

  return {
    ok: true,
  };
}

// ============================================================================
// UPDATE DELIVERY FEE
// ============================================================================

export async function updateDeliveryFee(
  areaId: string,
  deliveryFee: number,
  freeDeliveryAbove: number | null,
) {
  const auth =
    await requireDeliveryManager();

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  const cleanAreaId =
    validateAreaId(areaId);

  if (!cleanAreaId) {
    return {
      error: 'Invalid delivery area.',
    };
  }

  if (
    !validateNonNegativeNumber(
      deliveryFee,
    )
  ) {
    return {
      error:
        'Delivery fee must be zero or greater.',
    };
  }

  if (
    freeDeliveryAbove !== null &&
    !validateNonNegativeNumber(
      freeDeliveryAbove,
    )
  ) {
    return {
      error:
        'Free delivery threshold must be zero or greater.',
    };
  }

  const {
    data: area,
    error: areaLookupError,
  } = await supabase
    .from('delivery_areas')
    .select(
      'id, delivery_fee, free_delivery_above',
    )
    .eq('id', cleanAreaId)
    .maybeSingle();

  if (areaLookupError) {
    console.error(
      '[DELIVERY AREA] LOOKUP ERROR:',
      areaLookupError,
    );

    return {
      error:
        'Could not find this delivery area.',
    };
  }

  if (!area) {
    return {
      error: 'Delivery area not found.',
    };
  }

  /*
   * If nothing changed, avoid an unnecessary database write.
   */
  if (
    Number(area.delivery_fee) ===
      deliveryFee &&
    (area.free_delivery_above == null
      ? null
      : Number(
          area.free_delivery_above,
        )) === freeDeliveryAbove
  ) {
    return {
      ok: true,
    };
  }

  const {
    data: updatedArea,
    error: updateError,
  } = await supabase
    .from('delivery_areas')
    .update({
      delivery_fee: deliveryFee,
      free_delivery_above:
        freeDeliveryAbove,
    })
    .eq('id', cleanAreaId)
    .eq(
      'delivery_fee',
      area.delivery_fee,
    )
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      '[DELIVERY AREA] PRICING UPDATE ERROR:',
      updateError,
    );

    return {
      error:
        'Could not update pricing for this area.',
    };
  }

  if (!updatedArea) {
    return {
      error:
        'This delivery area was updated by someone else. Please refresh and try again.',
    };
  }

  refreshDeliveryAreas();

  return {
    ok: true,
  };
}