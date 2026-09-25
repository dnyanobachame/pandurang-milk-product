'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

const PRODUCTION_ROLES = ['admin', 'production_manager', 'production_staff'];
const QUALITY_ROLES = ['admin', 'production_manager', 'quality_control'];
const PACKING_ROLES = ['admin', 'production_manager', 'packing_manager', 'packing_staff'];

async function requireRole(allowed: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in again.' as const };

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !allowed.includes(profile.role)) {
    return { error: 'You are not authorized to do this.' as const };
  }
  return { supabase, user, role: profile.role };
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
  ratePerLitre: number;
  collectionCenter?: string;
}) {
  const auth = await requireRole(PRODUCTION_ROLES);
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { error } = await supabase.from('milk_collections').insert({
    supplier_id: input.supplierId,
    milk_type: input.milkType,
    quantity_litres: input.quantityLitres,
    fat_percent: input.fatPercent ?? null,
    snf_percent: input.snfPercent ?? null,
    temperature: input.temperature ?? null,
    rate_per_litre: input.ratePerLitre,
    collection_center: input.collectionCenter || null,
    recorded_by: user.id,
    quality_status: 'hold', // always starts on hold — Quality Control must clear it
  });

  if (error) return { error: 'Could not record this collection. Please try again.' };

  revalidatePath('/admin/production/collections');
  redirect('/admin/production/collections');
}

// ============================================================================
// QUALITY CONTROL
// Applies to both milk_collections and production_batches (reference_type).
// Passing a batch is the only thing that unblocks it downstream — a
// rejected/held collection can't be used in a production batch, and a
// rejected/held production batch can't be packaged.
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
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { error: testError } = await supabase.from('quality_tests').insert({
    reference_type: input.referenceType,
    reference_id: input.referenceId,
    fat_percent: input.fatPercent ?? null,
    snf_percent: input.snfPercent ?? null,
    temperature: input.temperature ?? null,
    acidity: input.acidity ?? null,
    status: input.status,
    inspector_id: user.id,
    notes: input.notes || null,
  });
  if (testError) return { error: 'Could not save this quality test.' };

  const table = input.referenceType === 'milk_collection' ? 'milk_collections' : 'production_batches';
  const { error: updateError } = await supabase
    .from(table)
    .update({ quality_status: input.status })
    .eq('id', input.referenceId);

  if (updateError) return { error: 'Quality test saved, but the batch status could not be updated.' };

  revalidatePath('/admin/production/quality');
  revalidatePath('/admin/production/collections');
  revalidatePath('/admin/production/batches');
  return { ok: true };
}

// ============================================================================
// PRODUCTION BATCHES
// A production batch is built from one or more *passed* milk collections.
// This is the root of the batch-traceability chain (see /admin/traceability).
// ============================================================================

function generateBatchNumber(productCode: string) {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 900 + 100); // 3-digit disambiguator
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
  const auth = await requireRole(PRODUCTION_ROLES);
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  if (input.milkCollectionIds.length === 0) {
    return { error: 'Select at least one passed milk collection as the source.' };
  }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + input.shelfLifeDays);

  const { error } = await supabase.from('production_batches').insert({
    batch_number: generateBatchNumber(input.productCode),
    product_id: input.productId,
    milk_collection_ids: input.milkCollectionIds,
    expiry_date: expiry.toISOString().slice(0, 10),
    quantity_produced: input.quantityProduced,
    production_staff_id: user.id,
    quality_status: 'hold', // must clear Quality Control before packaging
    notes: input.notes || null,
  });

  if (error) return { error: 'Could not create this production batch. Please try again.' };

  revalidatePath('/admin/production/batches');
  redirect('/admin/production/batches');
}

// ============================================================================
// PACKAGING — turns an approved production batch into packaged inventory.
// This is the step that actually makes stock available for sale.
// ============================================================================

export async function packageProductionBatch(input: {
  productionBatchId: string;
  productId: string;
  quantityPacked: number;
  packageSize: string;
  expiryDate: string;
}) {
  const auth = await requireRole(PACKING_ROLES);
  if ('error' in auth) return auth;
  const { supabase, user } = auth;

  const { data: batch } = await supabase
    .from('production_batches')
    .select('quality_status, quantity_produced, quantity_packed, batch_number')
    .eq('id', input.productionBatchId)
    .single();

  if (!batch) return { error: 'Production batch not found.' };
  if (batch.quality_status !== 'passed') {
    return { error: 'Only quality-approved batches can be packaged.' };
  }
  if (batch.quantity_packed + input.quantityPacked > batch.quantity_produced) {
    return { error: 'Packed quantity would exceed what was produced for this batch.' };
  }

  const packagingBatchNumber = `${batch.batch_number}-PKG`;

  const { data: packagingBatch, error: pkgError } = await supabase
    .from('packaging_batches')
    .insert({
      packaging_batch_number: packagingBatchNumber,
      production_batch_id: input.productionBatchId,
      product_id: input.productId,
      quantity_packed: input.quantityPacked,
      package_size: input.packageSize,
      packaging_staff_id: user.id,
      expiry_date: input.expiryDate,
      status: 'packed',
      packed_by: user.id,
      packed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (pkgError || !packagingBatch) return { error: 'Could not create the packaging batch.' };

  // Bump the production batch's packed tally.
  await supabase
    .from('production_batches')
    .update({ quantity_packed: batch.quantity_packed + input.quantityPacked })
    .eq('id', input.productionBatchId);

  // Add to inventory for this specific batch, and log the movement.
  await supabase.rpc('adjust_inventory', {
    p_product_id: input.productId,
    p_batch_id: packagingBatch.id,
    p_produced: input.quantityPacked,
  });
  await supabase.from('inventory_movements').insert({
    product_id: input.productId,
    batch_id: packagingBatch.id,
    movement_type: 'production',
    quantity: input.quantityPacked,
    reason: `Packaged from production batch ${batch.batch_number}`,
    performed_by: user.id,
  });

  // Bump the product's overall available_quantity so the storefront reflects it.
  await supabase.rpc('increment_product_stock', {
    p_product_id: input.productId,
    p_quantity: input.quantityPacked,
  });

  revalidatePath('/admin/production/batches');
  revalidatePath('/admin/inventory');
  return { ok: true, packagingBatchId: packagingBatch.id };
}
