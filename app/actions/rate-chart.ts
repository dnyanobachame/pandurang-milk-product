
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type MilkType = 'cow' | 'buffalo';

const UUIDSchema = z.string().uuid('Invalid rate ID.');

const RateInputSchema = z.object({
  milkType: z.enum(['cow', 'buffalo']),
  fat: z
    .number()
    .finite()
    .min(0, 'FAT percentage cannot be negative.')
    .max(100, 'FAT percentage cannot exceed 100.'),
  snf: z
    .number()
    .finite()
    .min(0, 'SNF percentage cannot be negative.')
    .max(100, 'SNF percentage cannot exceed 100.'),
  rate: z
    .number()
    .finite()
    .min(0, 'Rate per litre cannot be negative.')
    .max(100000, 'Rate per litre is too high.'),
  effectiveFrom: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Invalid effective date.'
    ),
});

async function requireAdmin() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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
    profile.role !== 'admin'
  ) {
    return {
      error:
        'You are not authorized to manage rate charts.' as const,
    };
  }

  return {
    supabase,
    user,
  };
}

function cleanNumber(
  value: FormDataEntryValue | null
) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const number = Number(raw);

  return Number.isFinite(number) ? number : null;
}

function cleanMilkType(
  value: FormDataEntryValue | null
): MilkType | null {
  const type = String(value ?? '')
    .trim()
    .toLowerCase();

  if (type === 'cow' || type === 'buffalo') {
    return type;
  }

  return null;
}

function cleanDate(
  value: FormDataEntryValue | null
) {
  const date = String(value ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  /**
   * Validate that the date actually exists.
   *
   * For example:
   * 2026-02-31 must not be accepted.
   */
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return date;
}

function parseRateFormData(formData: FormData) {
  const milkType = cleanMilkType(
    formData.get('milk_type')
  );

  const fat = cleanNumber(
    formData.get('fat_percent')
  );

  const snf = cleanNumber(
    formData.get('snf_percent')
  );

  const rate = cleanNumber(
    formData.get('rate_per_litre')
  );

  const effectiveFrom = cleanDate(
    formData.get('effective_from')
  );

  if (!milkType) {
    return {
      error: 'Please select a valid milk type.' as const,
    };
  }

  if (fat === null) {
    return {
      error: 'Please enter a valid FAT percentage.' as const,
    };
  }

  if (snf === null) {
    return {
      error: 'Please enter a valid SNF percentage.' as const,
    };
  }

  if (rate === null) {
    return {
      error: 'Please enter a valid rate per litre.' as const,
    };
  }

  if (!effectiveFrom) {
    return {
      error: 'Please select a valid effective date.' as const,
    };
  }

  const parsed = RateInputSchema.safeParse({
    milkType,
    fat,
    snf,
    rate,
    effectiveFrom,
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid rate chart data.',
    };
  }

  return {
    data: parsed.data,
  };
}

/**
 * Create a new milk rate.
 */
export async function createRate(
  formData: FormData
) {
  const auth = await requireAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const parsed = parseRateFormData(formData);

  if ('error' in parsed) {
    return {
      error: parsed.error,
    };
  }

  const {
    milkType,
    fat,
    snf,
    rate,
    effectiveFrom,
  } = parsed.data;

  const {
    data: existing,
    error: existingError,
  } = await auth.supabase
    .from('rate_chart')
    .select('id')
    .eq('milk_type', milkType)
    .eq('fat_percent', fat)
    .eq('snf_percent', snf)
    .eq('effective_from', effectiveFrom)
    .eq('is_active', true)
    .limit(1);

  if (existingError) {
    console.error(
      'createRate duplicate check error:',
      existingError
    );

    return {
      error:
        'Could not verify whether this rate already exists.',
    };
  }

  if (existing && existing.length > 0) {
    return {
      error:
        'An active rate already exists for this FAT + SNF combination on this date.',
    };
  }

  /**
   * Preserve the existing versioning design.
   *
   * NOTE:
   * This read-then-increment approach can still race if two
   * administrators create rates simultaneously. A database
   * sequence/atomic RPC would be the correct long-term fix,
   * but that should only be introduced after inspecting the
   * actual rate_chart schema.
   */
  const {
    data: latest,
    error: latestError,
  } = await auth.supabase
    .from('rate_chart')
    .select('version')
    .order('version', {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error(
      'createRate latest version error:',
      latestError
    );

    return {
      error:
        'Could not determine the next rate-chart version.',
    };
  }

  const version = Math.max(
    1,
    Number(latest?.version ?? 0) + 1
  );

  const { error: insertError } =
    await auth.supabase
      .from('rate_chart')
      .insert({
        milk_type: milkType,
        fat_percent: fat,
        snf_percent: snf,
        rate_per_litre: rate,
        effective_from: effectiveFrom,
        is_active: true,
        version,
        created_by: auth.user.id,
      });

  if (insertError) {
    console.error(
      'createRate insert error:',
      insertError
    );

    if (insertError.code === '23505') {
      return {
        error:
          'This rate already exists or conflicts with another rate-chart version.',
      };
    }

    return {
      error:
        'Could not create the rate. Please try again.',
    };
  }

  revalidatePath(
    '/admin/production/rate-chart'
  );

  revalidatePath(
    '/admin/production/collections'
  );

  revalidatePath(
    '/admin/production/collections/new'
  );

  return {
    success: true,
  };
}

/**
 * Update an existing rate.
 */
export async function updateRate(
  formData: FormData
) {
  const auth = await requireAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const id = String(
    formData.get('id') ?? ''
  ).trim();

  const idResult = UUIDSchema.safeParse(id);

  if (!idResult.success) {
    return {
      error: 'Rate ID is invalid.',
    };
  }

  const parsed = parseRateFormData(formData);

  if ('error' in parsed) {
    return {
      error: parsed.error,
    };
  }

  const {
    milkType,
    fat,
    snf,
    rate,
    effectiveFrom,
  } = parsed.data;

  const {
    data: existingRate,
    error: existingRateError,
  } = await auth.supabase
    .from('rate_chart')
    .select('id, is_active')
    .eq('id', id)
    .maybeSingle();

  if (existingRateError) {
    console.error(
      'updateRate lookup error:',
      existingRateError
    );

    return {
      error:
        'Could not load the selected rate.',
    };
  }

  if (!existingRate) {
    return {
      error: 'Rate not found.',
    };
  }

  const {
    data: duplicate,
    error: duplicateError,
  } = await auth.supabase
    .from('rate_chart')
    .select('id')
    .eq('milk_type', milkType)
    .eq('fat_percent', fat)
    .eq('snf_percent', snf)
    .eq('effective_from', effectiveFrom)
    .eq('is_active', true)
    .neq('id', id)
    .limit(1);

  if (duplicateError) {
    console.error(
      'updateRate duplicate check error:',
      duplicateError
    );

    return {
      error:
        'Could not verify whether another rate already exists.',
    };
  }

  if (duplicate && duplicate.length > 0) {
    return {
      error:
        'Another active rate already exists for this FAT + SNF combination on this date.',
    };
  }

  const {
    data: updated,
    error: updateError,
  } = await auth.supabase
    .from('rate_chart')
    .update({
      milk_type: milkType,
      fat_percent: fat,
      snf_percent: snf,
      rate_per_litre: rate,
      effective_from: effectiveFrom,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      'updateRate update error:',
      updateError
    );

    if (updateError.code === '23505') {
      return {
        error:
          'Another active rate already exists with these values.',
      };
    }

    return {
      error:
        'Could not update the rate. Please try again.',
    };
  }

  if (!updated) {
    return {
      error:
        'The rate could not be updated. It may have been removed or changed.',
    };
  }

  revalidatePath(
    '/admin/production/rate-chart'
  );

  revalidatePath(
    '/admin/production/collections'
  );

  revalidatePath(
    '/admin/production/collections/new'
  );

  return {
    success: true,
  };
}

/**
 * Activate or deactivate a rate.
 *
 * IMPORTANT:
 * This intentionally accepts:
 *   id: string
 *   active: boolean
 *
 * The client-side RateStatusButton calls this action.
 */
export async function toggleRateStatus(
  id: string,
  active: boolean
) {
  const auth = await requireAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const cleanId = String(id ?? '').trim();

  const idResult = UUIDSchema.safeParse(cleanId);

  if (!idResult.success) {
    return {
      error: 'Rate ID is invalid.',
    };
  }

  if (typeof active !== 'boolean') {
    return {
      error: 'Invalid rate status.',
    };
  }

  const {
    data: currentRate,
    error: currentRateError,
  } = await auth.supabase
    .from('rate_chart')
    .select(
      'id, milk_type, fat_percent, snf_percent, effective_from, is_active'
    )
    .eq('id', cleanId)
    .maybeSingle();

  if (currentRateError) {
    console.error(
      'toggleRateStatus lookup error:',
      currentRateError
    );

    return {
      error:
        'Could not load the selected rate.',
    };
  }

  if (!currentRate) {
    return {
      error: 'Rate not found.',
    };
  }

  if (currentRate.is_active === active) {
    return {
      success: true,
    };
  }

  /**
   * When activating a rate, prevent activating a duplicate
   * active FAT + SNF + date combination.
   */
  if (active) {
    const {
      data: duplicate,
      error: duplicateError,
    } = await auth.supabase
      .from('rate_chart')
      .select('id')
      .eq('milk_type', currentRate.milk_type)
      .eq('fat_percent', currentRate.fat_percent)
      .eq('snf_percent', currentRate.snf_percent)
      .eq(
        'effective_from',
        currentRate.effective_from
      )
      .eq('is_active', true)
      .neq('id', cleanId)
      .limit(1);

    if (duplicateError) {
      console.error(
        'toggleRateStatus duplicate check error:',
        duplicateError
      );

      return {
        error:
          'Could not verify whether another active rate exists.',
      };
    }

    if (duplicate && duplicate.length > 0) {
      return {
        error:
          'Another active rate already exists for this FAT + SNF combination on this date.',
      };
    }
  }

  const {
    data: updated,
    error: updateError,
  } = await auth.supabase
    .from('rate_chart')
    .update({
      is_active: active,
    })
    .eq('id', cleanId)
    .eq('is_active', currentRate.is_active)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      'toggleRateStatus update error:',
      updateError
    );

    if (updateError.code === '23505') {
      return {
        error:
          'Another active rate already exists with these values.',
      };
    }

    return {
      error:
        'Could not update the rate status. Please try again.',
    };
  }

  if (!updated) {
    return {
      error:
        'The rate status changed before this request completed. Please refresh and try again.',
    };
  }

  revalidatePath(
    '/admin/production/rate-chart'
  );

  revalidatePath(
    '/admin/production/collections'
  );

  revalidatePath(
    '/admin/production/collections/new'
  );

  return {
    success: true,
  };
}

/**
 * Deactivate a rate instead of physically deleting it.
 *
 * This preserves historical rate-chart records.
 */
export async function deleteRate(id: string) {
  const auth = await requireAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const cleanId = String(id ?? '').trim();

  const idResult = UUIDSchema.safeParse(cleanId);

  if (!idResult.success) {
    return {
      error: 'Rate ID is invalid.',
    };
  }

  const {
    data: existing,
    error: existingError,
  } = await auth.supabase
    .from('rate_chart')
    .select('id, is_active')
    .eq('id', cleanId)
    .maybeSingle();

  if (existingError) {
    console.error(
      'deleteRate lookup error:',
      existingError
    );

    return {
      error:
        'Could not load the selected rate.',
    };
  }

  if (!existing) {
    return {
      error: 'Rate not found.',
    };
  }

  if (existing.is_active === false) {
    return {
      success: true,
    };
  }

  const {
    data: updated,
    error: updateError,
  } = await auth.supabase
    .from('rate_chart')
    .update({
      is_active: false,
    })
    .eq('id', cleanId)
    .eq('is_active', true)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error(
      'deleteRate update error:',
      updateError
    );

    return {
      error:
        'Could not deactivate the rate. Please try again.',
    };
  }

  if (!updated) {
    return {
      error:
        'The rate was already changed. Please refresh and try again.',
    };
  }

  revalidatePath(
    '/admin/production/rate-chart'
  );

  revalidatePath(
    '/admin/production/collections'
  );

  revalidatePath(
    '/admin/production/collections/new'
  );

  return {
    success: true,
  };
}
