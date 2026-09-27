
'use server';

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { slugify, uniqueSlug } from '@/lib/slugify';

const STAFF_ROLES = ['admin', 'sales_manager', 'inventory_manager'] as const;

async function requireProductStaff() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' as const };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('PROFILE LOOKUP ERROR:', profileError);
    return { error: profileError.message };
  }

  if (
    !profile ||
    !STAFF_ROLES.includes(
      profile.role as (typeof STAFF_ROLES)[number]
    )
  ) {
    return {
      error: 'You are not authorized to manage products.' as const,
    };
  }

  return { supabase, user, role: profile.role };
}

async function logAudit(
  action: string,
  productId: string,
  performedBy: string,
  oldData: unknown,
  newData: unknown
) {
  try {
    const service = createServiceRoleClient();

    const { error } = await service.from('audit_logs').insert({
      table_name: 'products',
      record_id: productId,
      action,
      performed_by: performedBy,
      old_data: oldData ?? null,
      new_data: newData ?? null,
    });

    if (error) {
      console.error('AUDIT LOG ERROR:', error);
    }
  } catch (error) {
    console.error('AUDIT LOG EXCEPTION:', error);
  }
}

const ProductInputSchema = z
  .object({
    id: z.string().uuid().optional(),

    name: z
      .string()
      .trim()
      .min(1, 'Product name is required')
      .max(200),

    shortDescription: z
      .string()
      .trim()
      .max(300)
      .optional()
      .nullable(),

    description: z
      .string()
      .trim()
      .max(4000)
      .optional()
      .nullable(),

    categoryId: z.string().uuid('Please select a category'),

    sku: z
      .string()
      .trim()
      .min(1, 'SKU is required')
      .max(64),

    imageUrl: z.string().url().optional().nullable(),

    unit: z
      .string()
      .trim()
      .min(1, 'Please select or enter a unit')
      .max(40),

    sellingPrice: z.number({
      invalid_type_error: 'Please enter a valid price',
    }).positive('Price must be greater than 0'),

    mrp: z.number().positive().optional().nullable(),

    discountType: z
      .enum(['percentage', 'fixed'])
      .optional()
      .nullable(),

    discountValue: z
      .number()
      .min(0, 'Discount cannot be negative')
      .default(0),

    stock: z.number({
      invalid_type_error: 'Please enter a valid stock quantity',
    }).min(0, 'Stock cannot be negative'),

    lowStockThreshold: z
      .number()
      .min(0, 'Threshold cannot be negative')
      .default(10),

    minOrderQuantity: z
      .number()
      .min(1, 'Minimum order quantity must be at least 1')
      .default(1),

    maxOrderQuantity: z
      .number()
      .positive()
      .optional()
      .nullable(),

    isActive: z.boolean().default(true),

    isFeatured: z.boolean().default(false),

    displayOrder: z
      .number()
      .int()
      .default(0),

    deliveryAvailable: z.boolean().default(true),

    pickupAvailable: z.boolean().default(false),
  })
  .refine(
    (v) => v.mrp == null || v.mrp >= v.sellingPrice,
    {
      message:
        'MRP must be greater than or equal to the selling price',
      path: ['mrp'],
    }
  )
  .refine(
    (v) =>
      v.maxOrderQuantity == null ||
      v.maxOrderQuantity >= v.minOrderQuantity,
    {
      message:
        'Maximum order quantity must be at least the minimum order quantity',
      path: ['maxOrderQuantity'],
    }
  );

export type ProductFormInput = z.infer<
  typeof ProductInputSchema
>;

function toRow(
  v: ProductFormInput,
  slug: string
) {
  return {
    name: v.name,
    short_description: v.shortDescription || null,
    description: v.description || null,
    category_id: v.categoryId,
    sku: v.sku,
    image_url: v.imageUrl || null,
    unit: v.unit,
    selling_price: v.sellingPrice,
    mrp: v.mrp ?? null,
    discount_type: v.discountType ?? null,
    discount_value: v.discountValue,
    available_quantity: v.stock,
    min_stock_level: v.lowStockThreshold,
    min_order_quantity: v.minOrderQuantity,
    max_order_quantity: v.maxOrderQuantity ?? null,
    is_active: v.isActive,
    is_featured: v.isFeatured,
    display_order: v.displayOrder,
    delivery_available: v.deliveryAvailable,
    pickup_available: v.pickupAvailable,
    slug,
  };
}

async function resolveUniqueSlug(
  supabase: ReturnType<typeof createClient>,
  name: string,
  excludeId?: string
) {
  const base = slugify(name) || 'product';

  let query = supabase
    .from('products')
    .select('slug')
    .not('slug', 'is', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('SLUG LOOKUP ERROR:', error);
    throw new Error(error.message);
  }

  const existing = new Set(
    (data ?? []).map((r) => r.slug as string)
  );

  return uniqueSlug(base, existing);
}

export async function createProduct(
  input: ProductFormInput
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  const parsed = ProductInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid product details.',
    };
  }

  const { data: skuClash, error: skuError } =
    await supabase
      .from('products')
      .select('id')
      .eq('sku', parsed.data.sku)
      .maybeSingle();

  if (skuError) {
    console.error('SKU CHECK ERROR:', skuError);
    return { error: skuError.message };
  }

  if (skuClash) {
    return {
      error: 'A product with this SKU already exists.',
    };
  }

  let slug: string;

  try {
    slug = await resolveUniqueSlug(
      supabase,
      parsed.data.name
    );
  } catch (error) {
    console.error('CREATE SLUG ERROR:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not generate product slug.',
    };
  }

  const row = toRow(parsed.data, slug);

  const insertRow = parsed.data.id
    ? {
        id: parsed.data.id,
        ...row,
        product_code: row.sku,
        created_by: user.id,
      }
    : {
        ...row,
        product_code: row.sku,
        created_by: user.id,
      };

  const {
    data: created,
    error,
  } = await supabase
    .from('products')
    .insert(insertRow)
    .select('id')
    .single();

  if (error || !created) {
    console.error('CREATE PRODUCT ERROR:', error);

    return {
      error:
        error?.message ??
        'Product could not be saved.',
    };
  }

  await logAudit(
    'PRODUCT_CREATED',
    created.id,
    user.id,
    null,
    row
  );

  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath('/');

  return {
    ok: true,
    id: created.id,
  };
}

export async function updateProduct(
  id: string,
  input: ProductFormInput,
  expectedUpdatedAt?: string
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  if (!z.string().uuid().safeParse(id).success) {
    return { error: 'Invalid product.' };
  }

  const parsed = ProductInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid product details.',
    };
  }

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (currentError) {
    console.error(
      'CURRENT PRODUCT LOOKUP ERROR:',
      currentError
    );

    return {
      error: currentError.message,
    };
  }

  if (!current) {
    return {
      error: 'Product not found.',
    };
  }

  if (
    expectedUpdatedAt &&
    current.updated_at !== expectedUpdatedAt
  ) {
    return {
      error:
        'This product was changed by someone else since you opened it. Please reload and try again.',
      conflict: true,
    };
  }

  if (parsed.data.sku !== current.sku) {
    const {
      data: skuClash,
      error: skuError,
    } = await supabase
      .from('products')
      .select('id')
      .eq('sku', parsed.data.sku)
      .neq('id', id)
      .maybeSingle();

    if (skuError) {
      console.error(
        'UPDATE SKU CHECK ERROR:',
        skuError
      );

      return {
        error: skuError.message,
      };
    }

    if (skuClash) {
      return {
        error:
          'A product with this SKU already exists.',
      };
    }
  }

  let slug: string;

  try {
    slug =
      parsed.data.name === current.name &&
      current.slug
        ? current.slug
        : await resolveUniqueSlug(
            supabase,
            parsed.data.name,
            id
          );
  } catch (error) {
    console.error('UPDATE SLUG ERROR:', error);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not generate product slug.',
    };
  }

  const row = toRow(
    parsed.data,
    slug
  );

  const {
    error: updateError,
  } = await supabase
    .from('products')
    .update({
      ...row,
      updated_by: user.id,
    })
    .eq('id', id);

  if (updateError) {
    console.error(
      'UPDATE PRODUCT ERROR:',
      updateError
    );

    return {
      error: updateError.message,
    };
  }

  await logAudit(
    'PRODUCT_UPDATED',
    id,
    user.id,
    current,
    row
  );

  revalidatePath('/admin/products');
  revalidatePath('/products');
  revalidatePath(`/products/${current.id}`);
  revalidatePath('/');

  return {
    ok: true,
  };
}

export async function toggleProductStatus(
  id: string,
  isActive: boolean
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from('products')
    .select('is_active')
    .eq('id', id)
    .single();

  if (currentError) {
    console.error(
      'STATUS LOOKUP ERROR:',
      currentError
    );

    return {
      error: currentError.message,
    };
  }

  if (!current) {
    return {
      error: 'Product not found.',
    };
  }

  const {
    error: updateError,
  } = await supabase
    .from('products')
    .update({
      is_active: isActive,
      updated_by: user.id,
    })
    .eq('id', id);

  if (updateError) {
    console.error(
      'STATUS UPDATE ERROR:',
      updateError
    );

    return {
      error: updateError.message,
    };
  }

  await logAudit(
    isActive
      ? 'PRODUCT_ACTIVATED'
      : 'PRODUCT_DEACTIVATED',
    id,
    user.id,
    {
      is_active: current.is_active,
    },
    {
      is_active: isActive,
    }
  );

  revalidatePath('/admin/products');
  revalidatePath('/products');

  return {
    ok: true,
  };
}

export async function deleteProduct(
  id: string
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  const {
    data: current,
    error: currentError,
  } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (currentError) {
    console.error(
      'DELETE PRODUCT LOOKUP ERROR:',
      currentError
    );

    return {
      error: currentError.message,
    };
  }

  if (!current) {
    return {
      error: 'Product not found.',
    };
  }

  const {
    count,
    error: orderCheckError,
  } = await supabase
    .from('order_items')
    .select('id', {
      count: 'exact',
      head: true,
    })
    .eq('product_id', id);

  if (orderCheckError) {
    console.error(
      'ORDER HISTORY CHECK ERROR:',
      orderCheckError
    );

    return {
      error: orderCheckError.message,
    };
  }

  if (count && count > 0) {
    return {
      error:
        'This product has existing order history. Deactivate it instead of deleting it.',
      hasOrders: true,
    };
  }

  const {
    error: deleteError,
  } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error(
      'DELETE PRODUCT ERROR:',
      deleteError
    );

    return {
      error: deleteError.message,
    };
  }

  await logAudit(
    'PRODUCT_DELETED',
    id,
    user.id,
    current,
    null
  );

  revalidatePath('/admin/products');
  revalidatePath('/products');

  return {
    ok: true,
  };
}

export async function duplicateProduct(
  id: string
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  const {
    data: source,
    error: sourceError,
  } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (sourceError) {
    console.error(
      'DUPLICATE SOURCE LOOKUP ERROR:',
      sourceError
    );

    return {
      error: sourceError.message,
    };
  }

  if (!source) {
    return {
      error: 'Product not found.',
    };
  }

  const newSku =
    `${source.sku}-COPY-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  let newSlug: string;

  try {
    newSlug = await resolveUniqueSlug(
      supabase,
      `${source.name} copy`
    );
  } catch (error) {
    console.error(
      'DUPLICATE SLUG ERROR:',
      error
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not generate duplicate slug.',
    };
  }

  const {
    data: created,
    error,
  } = await supabase
    .from('products')
    .insert({
      name: `${source.name} (Copy)`,
      short_description: source.short_description,
      description: source.description,
      category_id: source.category_id,
      sku: newSku,
      product_code:
        `PC-${Date.now()
          .toString(36)
          .toUpperCase()}`,
      image_url: source.image_url,
      unit: source.unit,
      selling_price: source.selling_price,
      mrp: source.mrp,
      discount_type: source.discount_type,
      discount_value: source.discount_value,
      available_quantity: 0,
      min_stock_level: source.min_stock_level,
      min_order_quantity:
        source.min_order_quantity,
      max_order_quantity:
        source.max_order_quantity,
      is_active: false,
      is_featured: false,
      display_order: source.display_order,
      delivery_available:
        source.delivery_available,
      pickup_available:
        source.pickup_available,
      slug: newSlug,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !created) {
    console.error(
      'DUPLICATE PRODUCT ERROR:',
      error
    );

    return {
      error:
        error?.message ??
        'Could not duplicate this product.',
    };
  }

  await logAudit(
    'PRODUCT_CREATED',
    created.id,
    user.id,
    null,
    {
      duplicatedFrom: id,
    }
  );

  revalidatePath('/admin/products');

  return {
    ok: true,
    id: created.id,
  };
}

export async function deleteProductImageObject(
  path: string
) {
  const ctx = await requireProductStaff();

  if ('error' in ctx) {
    return { error: ctx.error };
  }

  const { supabase } = ctx;

  if (!path.startsWith('products/')) {
    return {
      error: 'Invalid image path.',
    };
  }

  const {
    error,
  } = await supabase.storage
    .from('product-images')
    .remove([path]);

  if (error) {
    console.error(
      'DELETE PRODUCT IMAGE ERROR:',
      error
    );

    return {
      error: error.message,
    };
  }

  return {
    ok: true,
  };
}
