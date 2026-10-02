
'use server';

import {
  createClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import type { AppRole } from '@/lib/roles';

const STAFF_ROLES: AppRole[] = [
  'production_manager',
  'production_staff',
  'quality_control',
  'packing_manager',
  'packing_staff',
  'inventory_manager',
  'sales_manager',
  'accountant',
  'customer_support',
  'delivery_manager',
  'delivery_partner',
  'admin',
];

const StaffRoleSchema = z.enum([
  'production_manager',
  'production_staff',
  'quality_control',
  'packing_manager',
  'packing_staff',
  'inventory_manager',
  'sales_manager',
  'accountant',
  'customer_support',
  'delivery_manager',
  'delivery_partner',
  'admin',
]);

const UserIdSchema = z.string().uuid();

const CreateStaffInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Please enter a valid full name.')
    .max(100, 'Full name is too long.'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.')
    .max(254, 'Email address is too long.'),

  mobile: z
    .string()
    .trim()
    .max(30, 'Mobile number is too long.')
    .optional(),

  role: StaffRoleSchema,

  vehicleNumber: z
    .string()
    .trim()
    .toUpperCase()
    .max(30, 'Vehicle number is too long.')
    .optional(),
});

const PromoteUserInputSchema = z.object({
  userId: UserIdSchema,

  role: StaffRoleSchema,

  vehicleNumber: z
    .string()
    .trim()
    .toUpperCase()
    .max(30, 'Vehicle number is too long.')
    .optional(),
});

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeMobile(value?: string) {
  const mobile = value?.trim() || '';
  return mobile || undefined;
}

function normalizeVehicleNumber(value?: string) {
  const vehicle = value?.trim().toUpperCase() || '';
  return vehicle || undefined;
}

/**
 * Generate a strong temporary password.
 */
function generateTemporaryPassword() {
  const lowercase =
    'abcdefghijklmnopqrstuvwxyz';

  const uppercase =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  const numbers = '0123456789';

  const special =
    "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

  const randomCharacter = (
    characters: string
  ) => {
    const index =
      randomBytes(4).readUInt32BE(0) %
      characters.length;

    return characters[index];
  };

  const requiredCharacters = [
    randomCharacter(lowercase),
    randomCharacter(uppercase),
    randomCharacter(numbers),
    randomCharacter(special),
  ];

  const allCharacters =
    lowercase + uppercase + numbers + special;

  for (
    let i = requiredCharacters.length;
    i < 16;
    i++
  ) {
    requiredCharacters.push(
      randomCharacter(allCharacters)
    );
  }

  for (
    let i = requiredCharacters.length - 1;
    i > 0;
    i--
  ) {
    const randomIndex =
      randomBytes(4).readUInt32BE(0) %
      (i + 1);

    [
      requiredCharacters[i],
      requiredCharacters[randomIndex],
    ] = [
      requiredCharacters[randomIndex],
      requiredCharacters[i],
    ];
  }

  return requiredCharacters.join('');
}

async function requireActiveAdmin() {
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
    data: callerProfile,
    error: callerError,
  } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (
    callerError ||
    !callerProfile ||
    callerProfile.role !== 'admin' ||
    callerProfile.is_active !== true
  ) {
    return {
      error:
        'Only an active Admin can perform this action.' as const,
    };
  }

  return {
    supabase,
    user,
  };
}

function validateVehicleForRole(
  role: AppRole,
  vehicleNumber?: string
) {
  if (
    role === 'delivery_partner' &&
    vehicleNumber &&
    (vehicleNumber.length < 3 ||
      vehicleNumber.length > 30)
  ) {
    return 'Please enter a valid vehicle number.';
  }

  return null;
}

/**
 * Create a completely new staff account.
 *
 * Only an active admin can create staff accounts.
 */
export async function createStaffUser(input: {
  fullName: string;
  email: string;
  mobile?: string;
  role: AppRole;
  vehicleNumber?: string;
}) {
  const auth = await requireActiveAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const parsed =
    CreateStaffInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid staff account details.',
    };
  }

  const fullName =
    parsed.data.fullName.trim();

  const email =
    normalizeEmail(parsed.data.email);

  const mobile =
    normalizeMobile(parsed.data.mobile);

  const vehicleNumber =
    normalizeVehicleNumber(
      parsed.data.vehicleNumber
    );

  const role = parsed.data.role;

  if (!STAFF_ROLES.includes(role)) {
    return {
      error: 'Invalid staff role.',
    };
  }

  const vehicleError =
    validateVehicleForRole(
      role,
      vehicleNumber
    );

  if (vehicleError) {
    return {
      error: vehicleError,
    };
  }

  /**
   * Generate the temporary password only
   * after all input validation has passed.
   */
  const tempPassword =
    generateTemporaryPassword();

  /**
   * Service-role client is used only after
   * the caller has been verified as an active admin.
   */
  const admin = createServiceRoleClient();

  const {
    data: created,
    error: createError,
  } =
    await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        mobile,
      },
    });

  if (createError || !created.user) {
    const message =
      createError?.message?.toLowerCase() || '';

    if (
      message.includes('already registered') ||
      message.includes('already exists')
    ) {
      return {
        error:
          'A user with this email already exists.',
      };
    }

    console.error(
      '[staff] auth account creation failed:',
      createError?.message
    );

    return {
      error:
        'Could not create this account.',
    };
  }

  const createdUserId =
    created.user.id;

  /**
   * Update the application profile created
   * by the Supabase auth/profile workflow.
   */
  const {
    data: updatedProfile,
    error: profileError,
  } =
    await admin
      .from('profiles')
      .update({
        full_name: fullName,
        mobile: mobile ?? null,
        email,
        role,
        is_active: true,
        must_change_password: true,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .eq('id', createdUserId)
      .select('id')
      .single();

  if (profileError || !updatedProfile) {
    /**
     * Compensating cleanup:
     * if the application profile cannot be
     * completed, remove the Auth account.
     */
    await admin.auth.admin.deleteUser(
      createdUserId
    );

    console.error(
      '[staff] profile creation failed:',
      profileError?.message
    );

    return {
      error:
        'The account could not be completed. No staff account was created.',
    };
  }

  /**
   * Delivery partner setup.
   */
  if (role === 'delivery_partner') {
    const {
      error: partnerError,
    } =
      await admin
        .from('delivery_partners')
        .insert({
          id: createdUserId,
          vehicle_number:
            vehicleNumber ?? null,
          is_on_duty: false,
        });

    if (partnerError) {
      /**
       * Remove the Auth account if delivery
       * partner setup cannot be completed.
       */
      await admin.auth.admin.deleteUser(
        createdUserId
      );

      console.error(
        '[staff] delivery partner creation failed:',
        partnerError.message
      );

      return {
        error:
          'The delivery partner account could not be completed. No account was created.',
      };
    }
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/delivery');

  /**
   * Temporary credentials are returned once.
   *
   * The client should display them securely
   * and should not persist them in browser storage.
   */
  return {
    ok: true,
    tempPassword,
    email,
    userId: createdUserId,
  };
}

/**
 * Promote an existing user into a staff role.
 *
 * This does NOT create a new Auth account.
 */
export async function promoteUserToStaff(input: {
  userId: string;
  role: AppRole;
  vehicleNumber?: string;
}) {
  const auth = await requireActiveAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const parsed =
    PromoteUserInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid staff role change request.',
    };
  }

  const targetUserId =
    parsed.data.userId;

  const role =
    parsed.data.role;

  const vehicleNumber =
    normalizeVehicleNumber(
      parsed.data.vehicleNumber
    );

  if (!STAFF_ROLES.includes(role)) {
    return {
      error: 'Invalid staff role.',
    };
  }

  /**
   * Prevent the current admin from
   * removing their own Admin role.
   */
  if (
    targetUserId === auth.user.id &&
    role !== 'admin'
  ) {
    return {
      error:
        'You cannot remove your own Admin role.',
    };
  }

  const vehicleError =
    validateVehicleForRole(
      role,
      vehicleNumber
    );

  if (vehicleError) {
    return {
      error: vehicleError,
    };
  }

  /**
   * Load the target user's current state.
   */
  const {
    data: targetProfile,
    error: targetError,
  } =
    await auth.supabase
      .from('profiles')
      .select(
        'id, full_name, email, mobile, role, is_active'
      )
      .eq('id', targetUserId)
      .single();

  if (targetError || !targetProfile) {
    return {
      error: 'User account not found.',
    };
  }

  const admin =
    createServiceRoleClient();

  /**
   * Optimistic concurrency protection:
   * only update if the role is still the same
   * value we just read.
   */
  const {
    data: updatedProfile,
    error: updateError,
  } =
    await admin
      .from('profiles')
      .update({
        role,
        is_active: true,
        updated_by: auth.user.id,
      })
      .eq('id', targetUserId)
      .eq('role', targetProfile.role)
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[staff] role update failed:',
      updateError.message
    );

    return {
      error:
        'Could not update the user role.',
    };
  }

  if (!updatedProfile) {
    return {
      error:
        'The user changed while this request was processing. Please refresh and try again.',
    };
  }

  /**
   * Delivery partner setup.
   */
  if (role === 'delivery_partner') {
    const {
      data: existingPartner,
      error: partnerLookupError,
    } =
      await admin
        .from('delivery_partners')
        .select(
          'id, vehicle_number, is_on_duty'
        )
        .eq('id', targetUserId)
        .maybeSingle();

    if (partnerLookupError) {
      console.error(
        '[staff] delivery partner lookup failed:',
        partnerLookupError.message
      );

      /**
       * Best-effort profile rollback.
       */
      await admin
        .from('profiles')
        .update({
          role: targetProfile.role,
          is_active:
            targetProfile.is_active,
          updated_by: auth.user.id,
        })
        .eq('id', targetUserId)
        .eq('role', role);

      return {
        error:
          'Could not verify the delivery partner record. The original role was restored.',
      };
    }

    if (existingPartner) {
      const {
        error: partnerUpdateError,
      } =
        await admin
          .from('delivery_partners')
          .update({
            vehicle_number:
              vehicleNumber ??
              existingPartner.vehicle_number ??
              null,
          })
          .eq('id', targetUserId);

      if (partnerUpdateError) {
        console.error(
          '[staff] delivery partner update failed:',
          partnerUpdateError.message
        );

        /**
         * Best-effort profile rollback.
         */
        await admin
          .from('profiles')
          .update({
            role: targetProfile.role,
            is_active:
              targetProfile.is_active,
            updated_by: auth.user.id,
          })
          .eq('id', targetUserId)
          .eq('role', role);

        return {
          error:
            'Could not update the delivery partner record. The original role was restored.',
        };
      }
    } else {
      const {
        error: partnerInsertError,
      } =
        await admin
          .from('delivery_partners')
          .insert({
            id: targetUserId,
            vehicle_number:
              vehicleNumber ?? null,
            is_on_duty: false,
          });

      if (partnerInsertError) {
        console.error(
          '[staff] delivery partner creation failed:',
          partnerInsertError.message
        );

        /**
         * Best-effort profile rollback.
         */
        await admin
          .from('profiles')
          .update({
            role: targetProfile.role,
            is_active:
              targetProfile.is_active,
            updated_by: auth.user.id,
          })
          .eq('id', targetUserId)
          .eq('role', role);

        return {
          error:
            'Could not create the delivery partner record. The original role was restored.',
        };
      }
    }
  }

  /**
   * If moving away from delivery partner,
   * remove duty but keep the record.
   */
  if (role !== 'delivery_partner') {
    const {
      error: partnerDeactivateError,
    } =
      await admin
        .from('delivery_partners')
        .update({
          is_on_duty: false,
        })
        .eq('id', targetUserId);

    if (partnerDeactivateError) {
      console.warn(
        '[staff] delivery partner cleanup warning:',
        partnerDeactivateError.message
      );
    }
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/delivery');
  revalidatePath('/admin/orders');

  return {
    ok: true,
    userId: targetUserId,
    role,
  };
}

/**
 * Activate/deactivate an existing account.
 *
 * Only an ACTIVE admin can change another account's status.
 * Admins cannot deactivate themselves.
 */
export async function setUserActive(
  userId: string,
  isActive: boolean
) {
  const auth = await requireActiveAdmin();

  if ('error' in auth) {
    return {
      error: auth.error,
    };
  }

  const parsedUserId =
    UserIdSchema.safeParse(
      String(userId ?? '').trim()
    );

  if (!parsedUserId.success) {
    return {
      error: 'User ID is invalid.',
    };
  }

  if (typeof isActive !== 'boolean') {
    return {
      error: 'Invalid account status.',
    };
  }

  const targetId =
    parsedUserId.data;

  /**
   * Prevent self-deactivation.
   */
  if (
    targetId === auth.user.id &&
    !isActive
  ) {
    return {
      error:
        'You cannot deactivate your own admin account.',
    };
  }

  const {
    data: targetProfile,
    error: targetError,
  } =
    await auth.supabase
      .from('profiles')
      .select(
        'id, role, is_active'
      )
      .eq('id', targetId)
      .single();

  if (targetError || !targetProfile) {
    return {
      error: 'User account not found.',
    };
  }

  /**
   * No-op if the requested state is already
   * the current state.
   */
  if (
    targetProfile.is_active ===
    isActive
  ) {
    return {
      ok: true,
      isActive,
    };
  }

  /**
   * Optimistic concurrency protection:
   * only update if the account still has the
   * state that we just read.
   */
  const admin =
    createServiceRoleClient();

  const {
    data: updated,
    error: updateError,
  } =
    await admin
      .from('profiles')
      .update({
        is_active: isActive,
        updated_by: auth.user.id,
      })
      .eq('id', targetId)
      .eq(
        'is_active',
        targetProfile.is_active
      )
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[staff] active status update failed:',
      updateError.message
    );

    return {
      error:
        'Could not update this account.',
    };
  }

  if (!updated) {
    return {
      error:
        'The account status changed before this request completed. Please refresh and try again.',
    };
  }

  /**
   * Delivery partner safety:
   * inactive delivery partners must never
   * remain on duty.
   */
  if (
    targetProfile.role ===
      'delivery_partner' &&
    !isActive
  ) {
    const {
      error: dutyError,
    } =
      await admin
        .from('delivery_partners')
        .update({
          is_on_duty: false,
        })
        .eq('id', targetId);

    if (dutyError) {
      console.warn(
        '[staff] could not automatically remove delivery duty:',
        dutyError.message
      );
    }
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin/delivery');
  revalidatePath('/admin/orders');

  return {
    ok: true,
    isActive,
  };
}
