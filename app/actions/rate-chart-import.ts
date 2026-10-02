
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type ImportDetail = {
  row: number;
  type: string;
  message: string;
};

type ImportResult = {
  success: boolean;
  inserted?: number;
  skipped?: number;
  errors?: number;
  details?: ImportDetail[];
  error?: string;
};

const RateChartRowSchema = z.object({
  milk_type: z
    .string()
    .trim()
    .min(1, 'Milk type is required')
    .max(50, 'Milk type is too long'),

  fat_percent: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine(
      (value) => {
        const number = Number(value);
        return (
          value !== '' &&
          Number.isFinite(number) &&
          number >= 0 &&
          number <= 100
        );
      },
      'Fat percentage must be between 0 and 100.'
    ),

  snf_percent: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine(
      (value) => {
        const number = Number(value);
        return (
          value !== '' &&
          Number.isFinite(number) &&
          number >= 0 &&
          number <= 100
        );
      },
      'SNF percentage must be between 0 and 100.'
    ),

  rate_per_litre: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine(
      (value) => {
        const number = Number(value);
        return (
          value !== '' &&
          Number.isFinite(number) &&
          number >= 0
        );
      },
      'Rate per litre must be a valid non-negative number.'
    ),

  effective_from: z
    .string()
    .trim()
    .min(1, 'Effective date is required')
    .max(30, 'Effective date is invalid'),
});

const ImportRowsSchema = z
  .array(RateChartRowSchema)
  .min(1, 'Please provide at least one CSV row.')
  .max(5000, 'A single import can contain at most 5,000 rows.');

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
        'You are not authorized to import rate charts.' as const,
    };
  }

  return {
    supabase,
    user,
  };
}

export async function importRateChartRows(
  rows: Array<{
    milk_type: string;
    fat_percent: string | number;
    snf_percent: string | number;
    rate_per_litre: string | number;
    effective_from: string;
  }>
): Promise<ImportResult> {
  const auth = await requireAdmin();

  if ('error' in auth) {
    return {
      success: false,
      error: auth.error,
    };
  }

  /**
   * Validate the complete input before sending anything
   * to the database RPC.
   */
  const parsed = ImportRowsSchema.safeParse(rows);

  if (!parsed.success) {
    const details: ImportDetail[] = [];

    for (const issue of parsed.error.issues) {
      const rowIndex =
        typeof issue.path[0] === 'number'
          ? issue.path[0]
          : -1;

      details.push({
        row: rowIndex >= 0 ? rowIndex + 1 : 0,
        type: 'validation',
        message: issue.message,
      });
    }

    return {
      success: false,
      errors: details.length,
      details,
      error:
        details[0]?.row && details[0].row > 0
          ? `Invalid data in CSV row ${details[0].row}.`
          : 'Invalid rate chart import data.',
    };
  }

  /**
   * Normalize values before calling the RPC.
   *
   * Milk type is normalized to lowercase so imports do not
   * accidentally create separate values such as:
   *
   *   Cow
   *   cow
   *   COW
   */
  const cleanRows = parsed.data.map((row) => ({
    milk_type: row.milk_type.trim().toLowerCase(),
    fat_percent: row.fat_percent.trim(),
    snf_percent: row.snf_percent.trim(),
    rate_per_litre: row.rate_per_litre.trim(),
    effective_from: row.effective_from.trim(),
  }));

  const { data, error } = await auth.supabase.rpc(
    'import_rate_chart_rows',
    {
      p_rows: cleanRows,
    }
  );

  if (error) {
    console.error(
      'importRateChartRows RPC error:',
      error
    );

    return {
      success: false,
      error:
        'Rate chart import failed. Please check the CSV and try again.',
    };
  }

  const result = data as ImportResult | null;

  if (!result || result.success !== true) {
    return {
      success: false,
      error:
        result?.error ??
        'Rate chart import failed.',
      inserted: result?.inserted,
      skipped: result?.skipped,
      errors: result?.errors,
      details: result?.details,
    };
  }

  revalidatePath('/admin/production/rate-chart');
  revalidatePath('/admin/production/collections');
  revalidatePath('/admin/production/collections/new');

  return {
    success: true,
    inserted: result.inserted ?? 0,
    skipped: result.skipped ?? 0,
    errors: result.errors ?? 0,
    details: result.details ?? [],
  };
}
