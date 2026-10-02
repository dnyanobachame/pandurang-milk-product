'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

/*
 * Production access
 *
 * These roles can work with milk collection.
 */
const PRODUCTION_ROLES = [
  'admin',
  'production_manager',
  'production_staff',
];

/*
 * Quality-control access.
 */
const QUALITY_ROLES = [
  'admin',
  'production_manager',
  'quality_control',
];

/*
 * Packing access.
 */
const PACKING_ROLES = [
  'admin',
  'production_manager',
  'packing_manager',
  'packing_staff',
];

/*
 * IMPORTANT:
 *
 * Creating a NEW production batch is a management-level operation.
 *
 * production_staff can record milk collections, but cannot create
 * production batches directly.
 */
const BATCH_CREATE_ROLES = [
  'admin',
  'production_manager',
];

/**
 * Require an authenticated ACTIVE user with one of the supplied roles.
 *
 * This is a SERVER-SIDE authorization check.
 *
 * UI/sidebar restrictions are not security by themselves.
 * Every protected server action must use this check.
 */
async function requireRole(allowed: string[]) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: 'Please sign in again.' as const,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    !allowed.includes(profile.role)
  ) {
    return {
      error: 'You are not authorized to do this.' as const,
    };
  }

  return {
    supabase,
    user,
    role: profile.role,
  };
}

// ============================================================================
// MILK COLLECTION
// ============================================================================

/**
 * Find the active Rate Chart entry for the supplied milk type + FAT + SNF.
 *
 * The lookup is intentionally exact. A collection can only be recorded when
 * an active Rate Chart row exists for the measured values.
 *
 * This is also used by the UI for a live preview. The save action performs
 * the same lookup again server-side, so the browser cannot choose the final
 * collection rate.
 */
export async function getMilkCollectionRate(input: {
  milkType: string;
  fatPercent?: number;
  snfPercent?: number;
}) {
  const auth = await requireRole(PRODUCTION_ROLES);

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  const milkType = input.milkType?.trim().toLowerCase();

  if (milkType !== 'cow' && milkType !== 'buffalo') {
    return {
      error: 'Please select a valid milk type.',
    };
  }

  if (
    input.fatPercent === undefined ||
    !Number.isFinite(input.fatPercent) ||
    input.fatPercent < 0
  ) {
    return {
      error: 'Enter a valid FAT percentage.',
    };
  }

  if (
    input.snfPercent === undefined ||
    !Number.isFinite(input.snfPercent) ||
    input.snfPercent < 0
  ) {
    return {
      error: 'Enter a valid SNF percentage.',
    };
  }

  /*
   * Rate Chart dates are business dates. Use the server date for the lookup.
   */
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('rate_chart')
    .select(
      'id, milk_type, fat_percent, snf_percent, rate_per_litre, effective_from, effective_to, version'
    )
    .eq('milk_type', milkType)
    .eq('fat_percent', input.fatPercent)
    .eq('snf_percent', input.snfPercent)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[MILK RATE LOOKUP] ERROR:',
      error
    );

    return {
      error: 'Could not load the applicable milk rate.',
    };
  }

  if (!data) {
    return {
      error:
        'No active Rate Chart entry matches this milk type, FAT and SNF.',
    };
  }

  return {
    success: true as const,
    ratePerLitre: Number(data.rate_per_litre),
    rateChartId: data.id,
    effectiveFrom: data.effective_from,
    effectiveTo: data.effective_to,
    version: data.version,
  };
}

// ============================================================================
// MILK COLLECTION
// ============================================================================

export async function recordMilkCollection(input: {
  supplierId: string;
  milkType: string;
  quantityLitres: number;
  fatPercent?: number;
  snfPercent?: number;
  temperature?: number;
  /**
   * Kept in the input for compatibility with existing callers.
   *
   * IMPORTANT: this value is NOT trusted. The final rate is always resolved
   * from the active Rate Chart on the server before the insert.
   */
  ratePerLitre?: number;
  collectionCenter?: string;
}) {
  const auth = await requireRole(PRODUCTION_ROLES);

  if ('error' in auth) {
    return auth;
  }

  const { supabase, user } = auth;

  /*
   * Basic server-side validation.
   */
  if (!input.supplierId) {
    return {
      error: 'Please select a supplier.',
    };
  }

  const milkType = input.milkType?.trim().toLowerCase();

  if (milkType !== 'cow' && milkType !== 'buffalo') {
    return {
      error: 'Please select a valid milk type.',
    };
  }

  if (
    !Number.isFinite(input.quantityLitres) ||
    input.quantityLitres <= 0
  ) {
    return {
      error: 'Quantity must be greater than zero.',
    };
  }

  if (
    input.fatPercent === undefined ||
    !Number.isFinite(input.fatPercent) ||
    input.fatPercent < 0
  ) {
    return {
      error: 'FAT percentage is required to determine the milk rate.',
    };
  }

  if (
    input.snfPercent === undefined ||
    !Number.isFinite(input.snfPercent) ||
    input.snfPercent < 0
  ) {
    return {
      error: 'SNF percentage is required to determine the milk rate.',
    };
  }

  /*
   * SECURITY:
   *
   * Never trust a rate supplied by the browser.
   * Resolve the final rate from the active Rate Chart on the server.
   */
  const today = new Date().toISOString().slice(0, 10);

  const { data: rateRow, error: rateError } = await supabase
    .from('rate_chart')
    .select(
      'id, rate_per_litre, effective_from, effective_to, version'
    )
    .eq('milk_type', milkType)
    .eq('fat_percent', input.fatPercent)
    .eq('snf_percent', input.snfPercent)
    .eq('is_active', true)
    .lte('effective_from', today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order('effective_from', { ascending: false })
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (rateError) {
    console.error(
      '[MILK COLLECTION] RATE LOOKUP ERROR:',
      rateError
    );

    return {
      error:
        'Could not determine the applicable milk rate. Please try again.',
    };
  }

  if (!rateRow) {
    return {
      error:
        'No active Rate Chart entry matches this milk type, FAT and SNF. Add the matching rate before recording the collection.',
    };
  }

  const finalRatePerLitre = Number(rateRow.rate_per_litre);

  if (
    !Number.isFinite(finalRatePerLitre) ||
    finalRatePerLitre < 0
  ) {
    return {
      error: 'The matching Rate Chart contains an invalid milk rate.',
    };
  }

  const { data: collection, error } = await supabase
    .from('milk_collections')
    .insert({
      supplier_id: input.supplierId,
      milk_type: milkType,
      quantity_litres: input.quantityLitres,
      fat_percent: input.fatPercent,
      snf_percent: input.snfPercent,
      temperature: input.temperature ?? null,

      /*
       * Final rate comes from the server-side Rate Chart lookup.
       * milk_collections.total_amount is generated by the database as:
       * quantity_litres * rate_per_litre
       */
      rate_per_litre: finalRatePerLitre,

      collection_center:
        input.collectionCenter?.trim() || null,
      recorded_by: user.id,

      /*
       * Every collection starts on hold.
       * Quality Control must clear it before downstream use.
       */
      quality_status: 'hold',
    })
    .select(
      'id, collection_date, collection_time, milk_type, quantity_litres, fat_percent, snf_percent, rate_per_litre, total_amount, quality_status'
    )
    .single();

  if (error || !collection) {
    console.error(
      '[MILK COLLECTION] INSERT ERROR:',
      error
    );

    return {
      error:
        'Could not record this collection. Please try again.',
    };
  }

  /*
   * Return the saved collection to the client so the operator can send
   * the farmer confirmation directly from this screen.
   */
  revalidatePath('/admin/production/collections');

  return {
    success: true as const,
    collection: {
      id: collection.id,
      collectionDate: collection.collection_date,
      collectionTime: collection.collection_time,
      milkType: collection.milk_type,
      quantityLitres: Number(collection.quantity_litres),
      fatPercent:
        collection.fat_percent === null
          ? null
          : Number(collection.fat_percent),
      snfPercent:
        collection.snf_percent === null
          ? null
          : Number(collection.snf_percent),
      ratePerLitre: Number(collection.rate_per_litre),
      totalAmount: Number(collection.total_amount),
      qualityStatus: collection.quality_status,
    },
  };
}

// ============================================================================
// QUALITY CONTROL
//
// Applies to both milk_collections and production_batches
// (reference_type).
//
// Passing a batch is the only thing that unblocks it downstream.
//
// A rejected/held collection cannot be used in a production batch,
// and a rejected/held production batch cannot be packaged.
// ============================================================================

export async function recordQualityDecision(input: {
  referenceType: 'milk_collection' | 'production_batch';
  referenceId: string;
  status: 'passed' | 'rejected' | 'hold';
  fatPercent?: number;
  snfPercent?: number;
  temperature?: number;
  acidity?: number;
  notes?: string;
}) {
  const auth = await requireRole(QUALITY_ROLES);

  if ('error' in auth) {
    return auth;
  }

  const { supabase, user } = auth;

  if (!input.referenceId) {
    return {
      error: 'Invalid quality-control reference.',
    };
  }

  if (
    input.referenceType !== 'milk_collection' &&
    input.referenceType !== 'production_batch'
  ) {
    return {
      error: 'Invalid quality-control reference type.',
    };
  }

  if (
    input.status !== 'passed' &&
    input.status !== 'rejected' &&
    input.status !== 'hold'
  ) {
    return {
      error: 'Invalid quality-control status.',
    };
  }

  const { error: testError } = await supabase
    .from('quality_tests')
    .insert({
      reference_type: input.referenceType,
      reference_id: input.referenceId,
      fat_percent: input.fatPercent ?? null,
      snf_percent: input.snfPercent ?? null,
      temperature: input.temperature ?? null,
      acidity: input.acidity ?? null,
      status: input.status,
      inspector_id: user.id,
      notes: input.notes?.trim() || null,
    });

  if (testError) {
    console.error(
      '[QUALITY CONTROL] INSERT ERROR:',
      testError
    );

    return {
      error: 'Could not save this quality test.',
    };
  }

  const table =
    input.referenceType === 'milk_collection'
      ? 'milk_collections'
      : 'production_batches';

  const {
    error: updateError,
  } = await supabase
    .from(table)
    .update({
      quality_status: input.status,
    })
    .eq('id', input.referenceId);

  if (updateError) {
    console.error(
      '[QUALITY CONTROL] STATUS UPDATE ERROR:',
      updateError
    );

    return {
      error:
        'Quality test saved, but the batch status could not be updated.',
    };
  }

  revalidatePath('/admin/production/quality');
  revalidatePath('/admin/production/collections');
  revalidatePath('/admin/production/batches');

  return {
    ok: true,
  };
}

// ============================================================================
// PRODUCTION BATCHES
//
// A production batch is built from one or more PASSED milk collections.
//
// IMPORTANT:
// Only admin and production_manager can CREATE a production batch.
//
// production_staff is intentionally NOT included in
// BATCH_CREATE_ROLES.
// ============================================================================

function generateBatchNumber(productCode: string) {
  const date = new Date();

  const y = date
    .getFullYear()
    .toString()
    .slice(2);

  const m = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const d = String(
    date.getDate()
  ).padStart(2, '0');

  const rand = Math.floor(
    Math.random() * 900 + 100
  );

  return `PM-${productCode}-${y}${m}${d}-${rand}`;
}

export async function createProductionBatch(input: {
  productId: string;
  productCode: string;
  milkCollectionIds: string[];
  quantityProduced: number;
  shelfLifeDays: number;
  notes?: string;
}) {
  /*
   * SECURITY:
   *
   * This is intentionally NOT:
   *
   * requireRole(PRODUCTION_ROLES)
   *
   * because production_staff is allowed to work with production
   * but should not independently create a production batch.
   */
  const auth = await requireRole(BATCH_CREATE_ROLES);

  if ('error' in auth) {
    return auth;
  }

  const { supabase, user } = auth;

  // --------------------------------------------------------------------------
  // Validate product
  // --------------------------------------------------------------------------

  if (!input.productId) {
    return {
      error: 'Please select a product.',
    };
  }

  if (!input.productCode?.trim()) {
    return {
      error: 'Product code is required.',
    };
  }

  // --------------------------------------------------------------------------
  // Validate source milk collections
  // --------------------------------------------------------------------------

  if (
    !Array.isArray(input.milkCollectionIds) ||
    input.milkCollectionIds.length === 0
  ) {
    return {
      error:
        'Select at least one passed milk collection as the source.',
    };
  }

  const uniqueCollectionIds = [
    ...new Set(input.milkCollectionIds),
  ];

  if (uniqueCollectionIds.length === 0) {
    return {
      error:
        'Select at least one passed milk collection as the source.',
    };
  }

  // --------------------------------------------------------------------------
  // Validate quantity
  // --------------------------------------------------------------------------

  if (
    !Number.isFinite(input.quantityProduced) ||
    input.quantityProduced <= 0
  ) {
    return {
      error:
        'Production quantity must be greater than zero.',
    };
  }

  // --------------------------------------------------------------------------
  // Validate shelf life
  // --------------------------------------------------------------------------

  if (
    !Number.isFinite(input.shelfLifeDays) ||
    input.shelfLifeDays <= 0
  ) {
    return {
      error:
        'Shelf life must be greater than zero days.',
    };
  }

  /*
   * --------------------------------------------------------------------------
   * IMPORTANT BUSINESS RULE:
   *
   * Every selected milk collection must have quality_status = passed.
   *
   * Do not trust the client-side production form.
   * Verify the source collections again on the server.
   * --------------------------------------------------------------------------
   */

  const {
    data: collections,
    error: collectionsError,
  } = await supabase
    .from('milk_collections')
    .select('id, quality_status')
    .in('id', uniqueCollectionIds);

  if (collectionsError) {
    console.error(
      '[PRODUCTION BATCH] COLLECTION LOOKUP ERROR:',
      collectionsError
    );

    return {
      error:
        'Could not validate the selected milk collections.',
    };
  }

  if (
    !collections ||
    collections.length !== uniqueCollectionIds.length
  ) {
    return {
      error:
        'One or more selected milk collections could not be found.',
    };
  }

  const invalidCollections = collections.filter(
    (collection) =>
      collection.quality_status !== 'passed'
  );

  if (invalidCollections.length > 0) {
    return {
      error:
        'Only quality-approved milk collections can be used for a production batch.',
    };
  }

  // --------------------------------------------------------------------------
  // Generate expiry date
  // --------------------------------------------------------------------------

  const expiry = new Date();

  expiry.setDate(
    expiry.getDate() + input.shelfLifeDays
  );

  // --------------------------------------------------------------------------
  // Create production batch
  // --------------------------------------------------------------------------

  const { error } = await supabase
    .from('production_batches')
    .insert({
      batch_number: generateBatchNumber(
        input.productCode.trim()
      ),
      product_id: input.productId,
      milk_collection_ids: uniqueCollectionIds,
      expiry_date: expiry
        .toISOString()
        .slice(0, 10),
      quantity_produced: input.quantityProduced,
      production_staff_id: user.id,

      /*
       * Newly created batches always require QC.
       */
      quality_status: 'hold',

      notes: input.notes?.trim() || null,
    });

  if (error) {
    console.error(
      '[PRODUCTION BATCH] INSERT ERROR:',
      error
    );

    return {
      error:
        'Could not create this production batch. Please try again.',
    };
  }

  revalidatePath(
    '/admin/production/batches'
  );

  redirect(
    '/admin/production/batches'
  );
}

// ============================================================================
// PACKAGING
//
// Turns an approved production batch into packaged inventory.
//
// This is the step that makes stock available for sale.
// ============================================================================

export async function packageProductionBatch(input: {
  productionBatchId: string;
  productId: string;
  quantityPacked: number;
  packageSize: string;
  expiryDate: string;
}) {
  const auth = await requireRole(PACKING_ROLES);

  if ('error' in auth) {
    return auth;
  }

  const { supabase } = auth;

  // --------------------------------------------------------------------------
  // Validate input
  // --------------------------------------------------------------------------

  if (!input.productionBatchId) {
    return {
      error: 'Invalid production batch.',
    };
  }

  if (!input.productId) {
    return {
      error: 'Invalid product.',
    };
  }

  if (
    !Number.isFinite(input.quantityPacked) ||
    input.quantityPacked <= 0
  ) {
    return {
      error:
        'Packed quantity must be greater than zero.',
    };
  }

  if (!input.packageSize?.trim()) {
    return {
      error: 'Package size is required.',
    };
  }

  if (!input.expiryDate) {
    return {
      error: 'Expiry date is required.',
    };
  }

  // --------------------------------------------------------------------------
  // IMPORTANT:
  //
  // Packaging is completed by the database transaction
  // `complete_production_packaging`.
  //
  // The RPC performs the authoritative checks and atomically:
  //   1. Locks and validates the production batch.
  //   2. Verifies the product and quality status.
  //   3. Verifies the remaining production quantity.
  //   4. Verifies the expiry date.
  //   5. Creates the packaging batch.
  //   6. Updates production quantity_packed.
  //   7. Creates/updates inventory.
  //   8. Records the inventory movement.
  //   9. Updates product available_quantity.
  //
  // Do NOT duplicate those writes here. Keeping them in one DB transaction
  // prevents partial packaging/inventory updates and concurrent stock issues.
  // --------------------------------------------------------------------------

  const {
    data: packagingBatchId,
    error: packagingError,
  } = await supabase.rpc(
    'complete_production_packaging',
    {
      p_production_batch_id: input.productionBatchId,
      p_product_id: input.productId,
      p_quantity_packed: input.quantityPacked,
      p_package_size: input.packageSize.trim(),
      p_expiry_date: input.expiryDate,
    },
  );

  if (packagingError || !packagingBatchId) {
    console.error(
      '[PACKAGING] COMPLETE PRODUCTION PACKAGING RPC ERROR:',
      packagingError,
    );

    return {
      error:
        packagingError?.message ||
        'Packaging could not be completed. Please check the production batch and try again.',
    };
  }

  // --------------------------------------------------------------------------
  // Revalidate affected pages
  // --------------------------------------------------------------------------

  revalidatePath(
    '/admin/production/batches',
  );

  revalidatePath(
    '/admin/inventory',
  );

  revalidatePath(
    '/admin/products',
  );

  revalidatePath(
    '/products',
  );

  return {
    ok: true,
    packagingBatchId,
  };
}

