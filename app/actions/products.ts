'use server';

import {
  createClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';

import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import {
  slugify,
  uniqueSlug,
} from '@/lib/slugify';

import {
  PRODUCT_UNITS,
  type ProductUnit,
} from '@/lib/product-image-path';

const STAFF_ROLES = [
  'admin',
  'sales_manager',
  'inventory_manager',
] as const;

function todayProductsTable(
  supabase: ReturnType<
    typeof createClient
  >
) {
  return (supabase as any).from(
    'today_products'
  );
}

/* =======================================================
 * AUTHORIZATION
 * ===================================================== */

async function requireProductStaff() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        'Please sign in again.' as const,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'role, is_active'
    )
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error(
      'PROFILE LOOKUP ERROR:',
      profileError
    );

    return {
      error:
        'Could not verify your staff account.',
    };
  }

  if (!profile?.is_active) {
    return {
      error:
        'Your staff account is inactive.',
    };
  }

  if (
    !STAFF_ROLES.includes(
      profile.role as
        (typeof STAFF_ROLES)[number]
    )
  ) {
    return {
      error:
        'You are not authorized to manage products.' as const,
    };
  }

  return {
    supabase,
    user,
    role: profile.role,
  };
}

/* =======================================================
 * AUDIT LOG
 * ===================================================== */

async function logAudit(
  action: string,
  productId: string,
  performedBy: string,
  oldData: unknown,
  newData: unknown
) {
  try {
    const service =
      createServiceRoleClient();

    const { error } =
      await service
        .from('audit_logs')
        .insert({
          table_name: 'products',
          record_id: productId,
          action,
          performed_by: performedBy,
          old_data:
            oldData ?? null,
          new_data:
            newData ?? null,
        });

    if (error) {
      console.error(
        'AUDIT LOG ERROR:',
        error
      );
    }
  } catch (error) {
    console.error(
      'AUDIT LOG EXCEPTION:',
      error
    );
  }
}

/* =======================================================
 * PRODUCT VALIDATION
 * ===================================================== */

const ProductInputSchema =
  z
    .object({
      id: z
        .string()
        .uuid()
        .optional(),

      name: z
        .string()
        .trim()
        .min(
          1,
          'Product name is required'
        )
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

      categoryId:
        z.string().uuid(
          'Please select a category'
        ),

      sku: z
        .string()
        .trim()
        .min(
          1,
          'SKU is required'
        )
        .max(64),

      imageUrl: z
        .string()
        .url()
        .optional()
        .nullable(),

      netQuantity: z
        .number({
          invalid_type_error:
            'Please enter a valid package quantity',
        })
        .finite()
        .positive(
          'Package quantity must be greater than 0'
        ),

      unit: z.enum(PRODUCT_UNITS, {
        errorMap: () => ({
          message:
            'Please select a valid package unit.',
        }),
      }),

      sellingPrice: z
        .number({
          invalid_type_error:
            'Please enter a valid price',
        })
        .finite()
        .positive(
          'Price must be greater than 0'
        ),

      mrp: z
        .number()
        .finite()
        .positive()
        .optional()
        .nullable(),

      discountType: z
        .enum([
          'percentage',
          'fixed',
        ])
        .optional()
        .nullable(),

      discountValue: z
        .number({
          invalid_type_error:
            'Please enter a valid discount',
        })
        .finite()
        .min(
          0,
          'Discount cannot be negative'
        )
        .default(0),

      stock: z
        .number({
          invalid_type_error:
            'Please enter a valid stock quantity',
        })
        .finite()
        .int(
          'Stock must be a whole number of packages'
        )
        .min(
          0,
          'Stock cannot be negative'
        ),

      lowStockThreshold: z
        .number({
          invalid_type_error:
            'Please enter a valid stock threshold',
        })
        .finite()
        .int(
          'Stock threshold must be a whole number'
        )
        .min(
          0,
          'Threshold cannot be negative'
        )
        .default(10),

      minOrderQuantity: z
        .number({
          invalid_type_error:
            'Please enter a valid minimum order quantity',
        })
        .finite()
        .int(
          'Minimum order quantity must be a whole number'
        )
        .min(
          1,
          'Minimum order quantity must be at least 1'
        )
        .default(1),

      maxOrderQuantity: z
        .number({
          invalid_type_error:
            'Please enter a valid maximum order quantity',
        })
        .finite()
        .int(
          'Maximum order quantity must be a whole number'
        )
        .positive()
        .optional()
        .nullable(),

      isActive: z
        .boolean()
        .default(true),

      isFeatured: z
        .boolean()
        .default(false),

      displayOrder: z
        .number()
        .finite()
        .int()
        .default(0),

      deliveryAvailable: z
        .boolean()
        .default(true),

      pickupAvailable: z
        .boolean()
        .default(false),
    })
    .refine(
      (value) =>
        value.mrp == null ||
        value.mrp >=
          value.sellingPrice,
      {
        message:
          'MRP must be greater than or equal to the selling price',
        path: ['mrp'],
      }
    )
    .refine(
      (value) =>
        value.maxOrderQuantity ==
          null ||
        value.maxOrderQuantity >=
          value.minOrderQuantity,
      {
        message:
          'Maximum order quantity must be at least the minimum order quantity',
        path: [
          'maxOrderQuantity',
        ],
      }
    )
    .refine(
      (value) => {
        if (
          value.discountType ===
          'percentage'
        ) {
          return (
            value.discountValue <=
            100
          );
        }

        return true;
      },
      {
        message:
          'Percentage discount cannot exceed 100%.',
        path: [
          'discountValue',
        ],
      }
    );

function isValidProductUnit(
  unit: string
): unit is ProductUnit {
  return (
    PRODUCT_UNITS as readonly string[]
  ).includes(unit);
}

export type ProductFormInput =
  z.infer<
    typeof ProductInputSchema
  >;

/* =======================================================
 * PRODUCT ROW MAPPER
 * ===================================================== */

function toRow(
  value: ProductFormInput,
  slug: string,
  includeStock = true
) {
  return {
    name: value.name,

    short_description:
      value.shortDescription ||
      null,

    description:
      value.description ||
      null,

    category_id:
      value.categoryId,

    sku: value.sku,

    image_url:
      value.imageUrl || null,

    net_quantity:
      value.netQuantity,

    unit:
      value.unit,

    selling_price:
      value.sellingPrice,

    mrp:
      value.mrp ?? null,

    discount_type:
      value.discountType ?? null,

    discount_value:
      value.discountValue,

    ...(includeStock
      ? { available_quantity: value.stock }
      : {}),

    min_stock_level:
      value.lowStockThreshold,

    min_order_quantity:
      value.minOrderQuantity,

    max_order_quantity:
      value.maxOrderQuantity ??
      null,

    is_active:
      value.isActive,

    is_featured:
      value.isFeatured,

    display_order:
      value.displayOrder,

    delivery_available:
      value.deliveryAvailable,

    pickup_available:
      value.pickupAvailable,

    slug,
  };
}

/* =======================================================
 * UNIQUE SLUG
 * ===================================================== */

async function resolveUniqueSlug(
  supabase: ReturnType<
    typeof createClient
  >,
  name: string,
  excludeId?: string
) {
  const base =
    slugify(name) ||
    'product';

  let query = supabase
    .from('products')
    .select('slug')
    .not('slug', 'is', null);

  if (excludeId) {
    query = query.neq(
      'id',
      excludeId
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      'SLUG LOOKUP ERROR:',
      error
    );

    throw new Error(
      error.message
    );
  }

  const existing =
    new Set(
      (data ?? []).map(
        (row) =>
          row.slug as string
      )
    );

  return uniqueSlug(
    base,
    existing
  );
}

/* =======================================================
 * CREATE PRODUCT
 * ===================================================== */

export async function createProduct(
  input: ProductFormInput
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  const parsed =
    ProductInputSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]
          ?.message ??
        'Invalid product details.',
    };
  }

  if (
    !isValidProductUnit(
      parsed.data.unit
    )
  ) {
    return {
      error:
        'Invalid product package unit.',
    };
  }

  const {
    data: skuClash,
    error: skuError,
  } =
    await supabase
      .from('products')
      .select('id')
      .eq(
        'sku',
        parsed.data.sku
      )
      .maybeSingle();

  if (skuError) {
    console.error(
      'SKU CHECK ERROR:',
      skuError
    );

    return {
      error:
        'Could not verify SKU uniqueness.',
    };
  }

  if (skuClash) {
    return {
      error:
        'A product with this SKU already exists.',
    };
  }

  let slug: string;

  try {
    slug =
      await resolveUniqueSlug(
        supabase,
        parsed.data.name
      );
  } catch (error) {
    console.error(
      'CREATE SLUG ERROR:',
      error
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not generate product slug.',
    };
  }

  const row = toRow(
    parsed.data,
    slug,
    true
  );

  const insertRow =
    parsed.data.id
      ? {
          id: parsed.data.id,
          ...row,
          product_code:
            row.sku,
          created_by:
            user.id,
        }
      : {
          ...row,
          product_code:
            row.sku,
          created_by:
            user.id,
        };

  const {
    data: created,
    error,
  } =
    await supabase
      .from('products')
      .insert(insertRow)
      .select('id')
      .single();

  if (error || !created) {
    console.error(
      'CREATE PRODUCT ERROR:',
      error
    );

    if (
      error?.code === '23505' &&
      /sku/i.test(
        `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`
      )
    ) {
      return {
        error: 'A product with this SKU already exists.',
      };
    }

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

  revalidateProductPaths(
    created.id
  );

  return {
    ok: true,
    id: created.id,
  };
}

/* =======================================================
 * UPDATE PRODUCT
 * ===================================================== */

export async function updateProduct(
  id: string,
  input: ProductFormInput,
  expectedUpdatedAt?: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(id)
      .success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const parsed =
    ProductInputSchema.safeParse(
      input
    );

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]
          ?.message ??
        'Invalid product details.',
    };
  }

  if (
    !isValidProductUnit(
      parsed.data.unit
    )
  ) {
    return {
      error:
        'Invalid product package unit.',
    };
  }

  const {
    data: current,
    error: currentError,
  } =
    await supabase
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
      error:
        'Could not load the current product.',
    };
  }

  if (!current) {
    return {
      error:
        'Product not found.',
    };
  }

  if (
    expectedUpdatedAt &&
    current.updated_at !==
      expectedUpdatedAt
  ) {
    return {
      error:
        'This product was changed by someone else since you opened it. Please reload and try again.',
      conflict: true,
    };
  }

  if (
    parsed.data.sku !==
    current.sku
  ) {
    const {
      data: skuClash,
      error: skuError,
    } =
      await supabase
        .from('products')
        .select('id')
        .eq(
          'sku',
          parsed.data.sku
        )
        .neq('id', id)
        .maybeSingle();

    if (skuError) {
      console.error(
        'UPDATE SKU CHECK ERROR:',
        skuError
      );

      return {
        error:
          'Could not verify SKU uniqueness.',
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
      parsed.data.name ===
        current.name &&
      current.slug
        ? current.slug
        : await resolveUniqueSlug(
            supabase,
            parsed.data.name,
            id
          );
  } catch (error) {
    console.error(
      'UPDATE SLUG ERROR:',
      error
    );

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not generate product slug.',
    };
  }

  const row = toRow(
    parsed.data,
    slug,
    false
  );

  const {
    error: updateError,
  } =
    await supabase
      .from('products')
      .update({
        ...row,
        updated_by:
          user.id,
      })
      .eq('id', id);

  if (updateError) {
    console.error(
      'UPDATE PRODUCT ERROR:',
      updateError
    );

    if (
      updateError.code === '23505' &&
      /sku/i.test(
        `${updateError.message ?? ''} ${updateError.details ?? ''} ${updateError.hint ?? ''}`
      )
    ) {
      return {
        error: 'A product with this SKU already exists.',
      };
    }

    return {
      error:
        updateError.message,
    };
  }

  await logAudit(
    'PRODUCT_UPDATED',
    id,
    user.id,
    current,
    row
  );

  revalidateProductPaths(id);

  return {
    ok: true,
  };
}

/* =======================================================
 * TOGGLE PRODUCT
 * ===================================================== */

export async function toggleProductStatus(
  id: string,
  isActive: boolean
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(id)
      .success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const {
    data: current,
    error: currentError,
  } =
    await supabase
      .from('products')
      .select(
        'id, is_active'
      )
      .eq('id', id)
      .single();

  if (currentError) {
    console.error(
      'STATUS LOOKUP ERROR:',
      currentError
    );

    return {
      error:
        currentError.message,
    };
  }

  if (!current) {
    return {
      error:
        'Product not found.',
    };
  }

  const {
    error: updateError,
  } =
    await supabase
      .from('products')
      .update({
        is_active:
          isActive,
        updated_by:
          user.id,
      })
      .eq('id', id);

  if (updateError) {
    console.error(
      'STATUS UPDATE ERROR:',
      updateError
    );

    return {
      error:
        updateError.message,
    };
  }

  await logAudit(
    isActive
      ? 'PRODUCT_ACTIVATED'
      : 'PRODUCT_DEACTIVATED',
    id,
    user.id,
    {
      is_active:
        current.is_active,
    },
    {
      is_active:
        isActive,
    }
  );

  revalidateProductPaths(id);

  return {
    ok: true,
  };
}

/* =======================================================
 * DELETE PRODUCT
 * ===================================================== */

export async function deleteProduct(
  id: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(id)
      .success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const {
    data: current,
    error: currentError,
  } =
    await supabase
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
      error:
        currentError.message,
    };
  }

  if (!current) {
    return {
      error:
        'Product not found.',
    };
  }

  const {
    count,
    error: orderCheckError,
  } =
    await supabase
      .from('order_items')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq(
        'product_id',
        id
      );

  if (orderCheckError) {
    console.error(
      'ORDER HISTORY CHECK ERROR:',
      orderCheckError
    );

    return {
      error:
        orderCheckError.message,
    };
  }

  if (
    count &&
    count > 0
  ) {
    return {
      error:
        'This product has existing order history. Deactivate it instead of deleting it.',
      hasOrders: true,
    };
  }

  const {
    error: deleteError,
  } =
    await supabase
      .from('products')
      .delete()
      .eq('id', id);

  if (deleteError) {
    console.error(
      'DELETE PRODUCT ERROR:',
      deleteError
    );

    return {
      error:
        deleteError.message,
    };
  }

  await logAudit(
    'PRODUCT_DELETED',
    id,
    user.id,
    current,
    null
  );

  revalidateProductPaths(id);

  return {
    ok: true,
  };
}

/* =======================================================
 * DUPLICATE PRODUCT
 * ===================================================== */

export async function duplicateProduct(
  id: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(id)
      .success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const {
    data: source,
    error: sourceError,
  } =
    await supabase
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
      error:
        sourceError.message,
    };
  }

  if (!source) {
    return {
      error:
        'Product not found.',
    };
  }

  if (
    !isValidProductUnit(
      String(source.unit)
    )
  ) {
    return {
      error:
        'The source product has an invalid package unit. Fix the source product before duplicating it.',
    };
  }

  const newSku =
    `${source.sku}-COPY-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  let newSlug: string;

  try {
    newSlug =
      await resolveUniqueSlug(
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
  } =
    await supabase
      .from('products')
      .insert({
        name: `${source.name} (Copy)`,

        short_description:
          source.short_description,

        description:
          source.description,

        category_id:
          source.category_id,

        sku: newSku,

        product_code:
          `PC-${Date.now()
            .toString(36)
            .toUpperCase()}`,

        image_url:
          source.image_url,

        net_quantity:
          source.net_quantity,

        unit:
          source.unit,

        selling_price:
          source.selling_price,

        mrp:
          source.mrp,

        discount_type:
          source.discount_type,

        discount_value:
          source.discount_value,

        available_quantity:
          0,

        min_stock_level:
          source.min_stock_level,

        min_order_quantity:
          source.min_order_quantity,

        max_order_quantity:
          source.max_order_quantity,

        is_active:
          false,

        is_featured:
          false,

        display_order:
          source.display_order,

        delivery_available:
          source.delivery_available,

        pickup_available:
          source.pickup_available,

        slug: newSlug,

        created_by:
          user.id,
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
      duplicatedFrom:
        id,
    }
  );

  revalidateProductPaths(
    created.id
  );

  return {
    ok: true,
    id: created.id,
  };
}

/* =======================================================
 * DELETE PRODUCT IMAGE
 * ===================================================== */

export async function deleteProductImageObject(
  path: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
  } = ctx;

  if (
    !path.startsWith(
      'products/'
    )
  ) {
    return {
      error:
        'Invalid image path.',
    };
  }

  const {
    error,
  } =
    await supabase.storage
      .from(
        'product-images'
      )
      .remove([path]);

  if (error) {
    console.error(
      'DELETE PRODUCT IMAGE ERROR:',
      error
    );

    return {
      error:
        error.message,
    };
  }

  return {
    ok: true,
  };
}

/* =======================================================
 * TODAY'S PRODUCTS
 * ===================================================== */

export async function addTodayProduct(
  productId: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(
      productId
    ).success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const {
    data: product,
    error: productError,
  } =
    await supabase
      .from('products')
      .select(
        'id, name, is_active'
      )
      .eq(
        'id',
        productId
      )
      .single();

  if (productError) {
    console.error(
      'TODAY PRODUCT LOOKUP ERROR:',
      productError
    );

    return {
      error:
        productError.message,
    };
  }

  if (!product) {
    return {
      error:
        'Product not found.',
    };
  }

  if (!product.is_active) {
    return {
      error:
        'Only active products can be added to Today’s Products.',
    };
  }

  const table =
    todayProductsTable(
      supabase
    );

  const {
    data: existing,
    error: existingError,
  } =
    await table
      .select('id')
      .eq(
        'product_id',
        productId
      )
      .maybeSingle();

  if (existingError) {
    console.error(
      'TODAY PRODUCT EXISTING CHECK ERROR:',
      existingError
    );

    return {
      error:
        existingError.message,
    };
  }

  if (existing) {
    return {
      error:
        'This product is already in Today’s Products.',
    };
  }

  const {
    data: maxRow,
    error: maxError,
  } =
    await table
      .select(
        'display_order'
      )
      .order(
        'display_order',
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (maxError) {
    console.error(
      'TODAY PRODUCT ORDER LOOKUP ERROR:',
      maxError
    );

    return {
      error:
        maxError.message,
    };
  }

  const nextOrder =
    (maxRow?.display_order ??
      -1) + 1;

  const {
    error: insertError,
  } =
    await table
      .insert({
        product_id:
          productId,

        display_order:
          nextOrder,
      });

  if (insertError) {
    console.error(
      'TODAY PRODUCT INSERT ERROR:',
      insertError
    );

    return {
      error:
        insertError.message,
    };
  }

  await logAudit(
    'TODAY_PRODUCT_ADDED',
    productId,
    user.id,
    null,
    {
      product_id:
        productId,

      display_order:
        nextOrder,
    }
  );

  revalidatePath(
    '/admin/products/today'
  );

  revalidatePath('/');

  return {
    ok: true,
  };
}

export async function removeTodayProduct(
  productId: string
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (
    !z.string().uuid().safeParse(
      productId
    ).success
  ) {
    return {
      error:
        'Invalid product.',
    };
  }

  const table =
    todayProductsTable(
      supabase
    );

  const {
    data: current,
    error: currentError,
  } =
    await table
      .select(
        'id, product_id, display_order'
      )
      .eq(
        'product_id',
        productId
      )
      .maybeSingle();

  if (currentError) {
    console.error(
      'TODAY PRODUCT REMOVE LOOKUP ERROR:',
      currentError
    );

    return {
      error:
        currentError.message,
    };
  }

  if (!current) {
    return {
      error:
        'Product is not in Today’s Products.',
    };
  }

  const {
    error: deleteError,
  } =
    await table
      .delete()
      .eq(
        'product_id',
        productId
      );

  if (deleteError) {
    console.error(
      'TODAY PRODUCT DELETE ERROR:',
      deleteError
    );

    return {
      error:
        deleteError.message,
    };
  }

  await logAudit(
    'TODAY_PRODUCT_REMOVED',
    productId,
    user.id,
    current,
    null
  );

  revalidatePath(
    '/admin/products/today'
  );

  revalidatePath('/');

  return {
    ok: true,
  };
}

export async function reorderTodayProducts(
  productIds: string[]
) {
  const ctx =
    await requireProductStaff();

  if ('error' in ctx) {
    return {
      error: ctx.error,
    };
  }

  const {
    supabase,
    user,
  } = ctx;

  if (!Array.isArray(productIds)) {
    return {
      error:
        'Invalid product list.',
    };
  }

  if (
    productIds.length === 0
  ) {
    revalidatePath(
      '/admin/products/today'
    );

    revalidatePath('/');

    return {
      ok: true,
    };
  }

  const parsedIds =
    productIds.map(
      (id) =>
        z
          .string()
          .uuid()
          .safeParse(id)
    );

  if (
    parsedIds.some(
      (result) =>
        !result.success
    )
  ) {
    return {
      error:
        'One or more product IDs are invalid.',
    };
  }

  const uniqueIds =
    new Set(productIds);

  if (
    uniqueIds.size !==
    productIds.length
  ) {
    return {
      error:
        'Duplicate products are not allowed.',
    };
  }

  const table =
    todayProductsTable(
      supabase
    );

  const {
    data: currentRows,
    error: currentError,
  } =
    await table
      .select(
        'product_id, display_order'
      )
      .in(
        'product_id',
        productIds
      );

  if (currentError) {
    console.error(
      'TODAY PRODUCT REORDER LOOKUP ERROR:',
      currentError
    );

    return {
      error:
        currentError.message,
    };
  }

  if (
    (currentRows?.length ??
      0) !==
    productIds.length
  ) {
    return {
      error:
        'Today’s Products changed. Please refresh the page and try again.',
    };
  }

  for (
    let index = 0;
    index <
    productIds.length;
    index++
  ) {
    const {
      error,
    } =
      await table
        .update({
          display_order:
            -(index + 1),
        })
        .eq(
          'product_id',
          productIds[index]
        );

    if (error) {
      console.error(
        'TODAY PRODUCT TEMP ORDER ERROR:',
        error
      );

      return {
        error:
          error.message,
      };
    }
  }

  for (
    let index = 0;
    index <
    productIds.length;
    index++
  ) {
    const {
      error,
    } =
      await table
        .update({
          display_order:
            index,
        })
        .eq(
          'product_id',
          productIds[index]
        );

    if (error) {
      console.error(
        'TODAY PRODUCT FINAL ORDER ERROR:',
        error
      );

      return {
        error:
          error.message,
      };
    }
  }

  await logAudit(
    'TODAY_PRODUCTS_REORDERED',
    productIds[0],
    user.id,
    currentRows,
    productIds.map(
      (
        productId,
        displayOrder
      ) => ({
        product_id:
          productId,

        display_order:
          displayOrder,
      })
    )
  );

  revalidatePath(
    '/admin/products/today'
  );

  revalidatePath('/');

  return {
    ok: true,
  };
}

/* =======================================================
 * PRODUCT PATH REVALIDATION
 * ===================================================== */

function revalidateProductPaths(
  productId?: string
) {
  revalidatePath(
    '/admin/products'
  );

  revalidatePath(
    '/admin/products/today'
  );

  revalidatePath(
    '/products'
  );

  revalidatePath('/');

  if (productId) {
    revalidatePath(
      `/products/${productId}`
    );
  }
}