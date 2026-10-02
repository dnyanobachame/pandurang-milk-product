
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SUPPLIER_ROLES = [
  'admin',
  'production_manager',
  'accountant',
] as const;

const SupplierIdSchema = z.string().uuid(
  'Invalid supplier ID.'
);

const SupplierInputSchema = z.object({
  supplierCode: z
    .string()
    .trim()
    .min(1, 'Supplier code is required.')
    .max(50, 'Supplier code is too long.'),

  name: z
    .string()
    .trim()
    .min(2, 'Supplier name is required.')
    .max(120, 'Supplier name is too long.'),

  mobile: z
    .string()
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      'Enter a valid 10-digit Indian mobile number.'
    ),

  village: z
    .string()
    .trim()
    .min(2, 'Village is required.')
    .max(120, 'Village name is too long.'),

  address: z
    .string()
    .trim()
    .max(300, 'Address is too long.')
    .optional(),
});

const SupplierStatusSchema = z.boolean();

type SupplierInput = {
  supplierCode: string;
  name: string;
  mobile: string;
  village: string;
  address?: string;
};

async function requireProductionStaff() {
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
    !SUPPLIER_ROLES.includes(
      profile.role as (typeof SUPPLIER_ROLES)[number]
    )
  ) {
    return {
      error:
        'You are not authorized to manage suppliers.' as const,
    };
  }

  return {
    supabase,
    user,
    role: profile.role,
  };
}

function parseSupplierInput(input: SupplierInput) {
  const parsed =
    SupplierInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid supplier details.',
    };
  }

  return {
    data: {
      supplierCode:
        parsed.data.supplierCode
          .trim()
          .toUpperCase(),

      name: parsed.data.name.trim(),

      mobile: parsed.data.mobile.trim(),

      village: parsed.data.village.trim(),

      address:
        parsed.data.address?.trim() || null,
    },
  };
}

function parseSupplierId(
  supplierId: string
) {
  const parsed =
    SupplierIdSchema.safeParse(
      String(supplierId ?? '').trim()
    );

  if (!parsed.success) {
    return {
      error: 'Supplier ID is invalid.',
    };
  }

  return {
    id: parsed.data,
  };
}

export async function createSupplier(
  input: SupplierInput
) {
  const auth =
    await requireProductionStaff();

  if ('error' in auth) {
    return auth;
  }

  const parsed =
    parseSupplierInput(input);

  if ('error' in parsed) {
    return parsed;
  }

  const {
    supplierCode,
    name,
    mobile,
    village,
    address,
  } = parsed.data;

  /**
   * Give a clear error before attempting the insert
   * when the supplier code is already present.
   */
  const {
    data: existing,
    error: existingError,
  } =
    await auth.supabase
      .from('suppliers')
      .select('id')
      .eq('supplier_code', supplierCode)
      .maybeSingle();

  if (existingError) {
    console.error(
      '[supplier] duplicate check failed:',
      existingError.message
    );

    return {
      error:
        'Could not verify the supplier code. Please try again.',
    };
  }

  if (existing) {
    return {
      error:
        'A supplier with this supplier code already exists.',
    };
  }

  const {
    error: insertError,
  } =
    await auth.supabase
      .from('suppliers')
      .insert({
        supplier_code: supplierCode,
        name,
        mobile,
        village,
        address,
      });

  if (insertError) {
    console.error(
      '[supplier] create failed:',
      insertError.message
    );

    if (insertError.code === '23505') {
      return {
        error:
          'A supplier with this supplier code already exists.',
      };
    }

    return {
      error:
        'Could not save this supplier. Please try again.',
    };
  }

  revalidatePath('/admin/suppliers');

  redirect('/admin/suppliers');
}

export async function updateSupplier(
  supplierId: string,
  input: SupplierInput
) {
  const auth =
    await requireProductionStaff();

  if ('error' in auth) {
    return auth;
  }

  const parsedId =
    parseSupplierId(supplierId);

  if ('error' in parsedId) {
    return parsedId;
  }

  const parsed =
    parseSupplierInput(input);

  if ('error' in parsed) {
    return parsed;
  }

  const {
    supplierCode,
    name,
    mobile,
    village,
    address,
  } = parsed.data;

  /**
   * Verify that the supplier exists before updating.
   */
  const {
    data: currentSupplier,
    error: currentError,
  } =
    await auth.supabase
      .from('suppliers')
      .select('id, supplier_code')
      .eq('id', parsedId.id)
      .maybeSingle();

  if (currentError) {
    console.error(
      '[supplier] lookup failed:',
      currentError.message
    );

    return {
      error:
        'Could not load this supplier.',
    };
  }

  if (!currentSupplier) {
    return {
      error: 'Supplier not found.',
    };
  }

  /**
   * Prevent duplicate supplier codes belonging
   * to another supplier.
   */
  const {
    data: duplicate,
    error: duplicateError,
  } =
    await auth.supabase
      .from('suppliers')
      .select('id')
      .eq('supplier_code', supplierCode)
      .neq('id', parsedId.id)
      .limit(1);

  if (duplicateError) {
    console.error(
      '[supplier] duplicate check failed:',
      duplicateError.message
    );

    return {
      error:
        'Could not verify the supplier code.',
    };
  }

  if (duplicate && duplicate.length > 0) {
    return {
      error:
        'Another supplier already uses this supplier code.',
    };
  }

  /**
   * Optimistic concurrency protection:
   * only update if the supplier code is still
   * the value we just read.
   */
  const {
    data: updated,
    error: updateError,
  } =
    await auth.supabase
      .from('suppliers')
      .update({
        supplier_code: supplierCode,
        name,
        mobile,
        village,
        address,
      })
      .eq('id', parsedId.id)
      .eq(
        'supplier_code',
        currentSupplier.supplier_code
      )
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[supplier] update failed:',
      updateError.message
    );

    if (updateError.code === '23505') {
      return {
        error:
          'Another supplier already uses this supplier code.',
      };
    }

    return {
      error:
        'Could not update this supplier. Please try again.',
    };
  }

  if (!updated) {
    return {
      error:
        'This supplier was changed by another request. Please refresh and try again.',
    };
  }

  revalidatePath('/admin/suppliers');
  revalidatePath(
    `/admin/suppliers/${parsedId.id}`
  );

  redirect('/admin/suppliers');
}

export async function toggleSupplierStatus(
  supplierId: string,
  isActive: boolean
) {
  const auth =
    await requireProductionStaff();

  if ('error' in auth) {
    return auth;
  }

  const parsedId =
    parseSupplierId(supplierId);

  if ('error' in parsedId) {
    return parsedId;
  }

  const parsedStatus =
    SupplierStatusSchema.safeParse(
      isActive
    );

  if (!parsedStatus.success) {
    return {
      error: 'Invalid supplier status.',
    };
  }

  const {
    data: currentSupplier,
    error: currentError,
  } =
    await auth.supabase
      .from('suppliers')
      .select('id, is_active')
      .eq('id', parsedId.id)
      .maybeSingle();

  if (currentError) {
    console.error(
      '[supplier] status lookup failed:',
      currentError.message
    );

    return {
      error:
        'Could not load this supplier.',
    };
  }

  if (!currentSupplier) {
    return {
      error: 'Supplier not found.',
    };
  }

  if (
    currentSupplier.is_active ===
    parsedStatus.data
  ) {
    return {
      success: true,
    };
  }

  const {
    data: updated,
    error: updateError,
  } =
    await auth.supabase
      .from('suppliers')
      .update({
        is_active: parsedStatus.data,
      })
      .eq('id', parsedId.id)
      .eq(
        'is_active',
        currentSupplier.is_active
      )
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[supplier] status update failed:',
      updateError.message
    );

    return {
      error:
        'Could not update supplier status.',
    };
  }

  if (!updated) {
    return {
      error:
        'The supplier status changed before this request completed. Please refresh and try again.',
    };
  }

  revalidatePath('/admin/suppliers');
  revalidatePath(
    `/admin/suppliers/${parsedId.id}`
  );

  return {
    success: true,
  };
}

export async function deleteSupplier(
  supplierId: string
) {
  const auth =
    await requireProductionStaff();

  if ('error' in auth) {
    return auth;
  }

  const parsedId =
    parseSupplierId(supplierId);

  if ('error' in parsedId) {
    return parsedId;
  }

  /**
   * First verify that the supplier exists.
   */
  const {
    data: supplier,
    error: supplierError,
  } =
    await auth.supabase
      .from('suppliers')
      .select('id')
      .eq('id', parsedId.id)
      .maybeSingle();

  if (supplierError) {
    console.error(
      '[supplier] delete lookup failed:',
      supplierError.message
    );

    return {
      error:
        'Could not load this supplier.',
    };
  }

  if (!supplier) {
    return {
      error: 'Supplier not found.',
    };
  }

  /**
   * Suppliers with milk collection history are
   * intentionally retained for historical reporting.
   */
  const {
    count,
    error: historyError,
  } =
    await auth.supabase
      .from('milk_collections')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'supplier_id',
        parsedId.id
      );

  if (historyError) {
    console.error(
      '[supplier] history check failed:',
      historyError.message
    );

    return {
      error:
        'Could not verify supplier history. Delete was cancelled.',
    };
  }

  if ((count ?? 0) > 0) {
    return {
      error:
        'This supplier has milk collection history and cannot be deleted. Deactivate the supplier instead.',
    };
  }

  /**
   * Delete only the supplier that was verified
   * above and confirm that a row was actually deleted.
   */
  const {
    data: deleted,
    error: deleteError,
  } =
    await auth.supabase
      .from('suppliers')
      .delete()
      .eq('id', parsedId.id)
      .select('id')
      .maybeSingle();

  if (deleteError) {
    console.error(
      '[supplier] delete failed:',
      deleteError.message
    );

    return {
      error:
        'Supplier could not be deleted. It may be referenced by other records. Deactivate it instead.',
    };
  }

  if (!deleted) {
    return {
      error:
        'The supplier could not be deleted. Please refresh and try again.',
    };
  }

  revalidatePath('/admin/suppliers');

  redirect('/admin/suppliers');
}
