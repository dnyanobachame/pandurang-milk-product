
'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const PRODUCTION_ROLES = [
  'admin',
  'production_manager',
  'production_staff',
] as const;

const CollectionIdSchema = z.string().uuid();

const WhatsAppConfigSchema = z.object({
  accessToken: z.string().min(1),
  phoneNumberId: z.string().min(1),
  templateName: z
    .string()
    .min(1)
    .max(512),
  templateLanguage: z
    .string()
    .min(1)
    .max(32),
  graphApiVersion: z
    .string()
    .regex(
      /^v\d+\.\d+$/,
      'Invalid WhatsApp Graph API version.'
    ),
});

async function requireProductionRole() {
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
    !PRODUCTION_ROLES.includes(
      profile.role as (typeof PRODUCTION_ROLES)[number]
    )
  ) {
    return {
      error:
        'You are not authorized to send farmer messages.' as const,
    };
  }

  return {
    supabase,
    user,
  };
}

function normalizeIndianWhatsAppNumber(
  value: string | null | undefined
) {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (
    digits.length === 12 &&
    digits.startsWith('91')
  ) {
    return digits;
  }

  if (
    digits.length === 11 &&
    digits.startsWith('0')
  ) {
    return `91${digits.slice(1)}`;
  }

  return '';
}

function isValidIndianWhatsAppNumber(
  phone: string
) {
  return /^91[6-9]\d{9}$/.test(phone);
}

function formatMilkType(value: unknown) {
  const milkType = String(value ?? '')
    .trim()
    .toLowerCase();

  if (!milkType) {
    return 'Milk';
  }

  return milkType.replace(
    /^./,
    (character) => character.toUpperCase()
  );
}

/**
 * Send a milk-collection confirmation through
 * WhatsApp Cloud API.
 *
 * This uses an approved WhatsApp template rather
 * than opening wa.me.
 *
 * Required server environment:
 * - WHATSAPP_ACCESS_TOKEN
 * - WHATSAPP_PHONE_NUMBER_ID
 * - WHATSAPP_COLLECTION_TEMPLATE_NAME
 *
 * Optional:
 * - WHATSAPP_COLLECTION_TEMPLATE_LANGUAGE
 *   default: en
 * - WHATSAPP_GRAPH_API_VERSION
 *   default: v23.0
 */
export async function sendMilkCollectionWhatsApp(
  collectionId: string
) {
  const auth = await requireProductionRole();

  if ('error' in auth) {
    return auth;
  }

  const parsedId =
    CollectionIdSchema.safeParse(
      String(collectionId ?? '').trim()
    );

  if (!parsedId.success) {
    return {
      error: 'Invalid collection reference.',
    };
  }

  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN?.trim();

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  const templateName =
    process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME?.trim();

  const templateLanguage =
    process.env.WHATSAPP_COLLECTION_TEMPLATE_LANGUAGE?.trim() ||
    'en';

  const graphApiVersion =
    process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ||
    'v23.0';

  const config =
    WhatsAppConfigSchema.safeParse({
      accessToken,
      phoneNumberId,
      templateName,
      templateLanguage,
      graphApiVersion,
    });

  if (!config.success) {
    console.error(
      '[WHATSAPP COLLECTION] CONFIGURATION ERROR:',
      config.error.flatten().fieldErrors
    );

    return {
      error:
        'WhatsApp sending is not configured correctly. Please check the server environment settings.',
    };
  }

  const { supabase } = auth;

  const {
    data: collection,
    error: collectionError,
  } = await supabase
    .from('milk_collections')
    .select(
      `
        id,
        collection_date,
        collection_time,
        milk_type,
        quantity_litres,
        fat_percent,
        snf_percent,
        rate_per_litre,
        total_amount,
        suppliers(name, mobile)
      `
    )
    .eq('id', parsedId.data)
    .single();

  if (collectionError || !collection) {
    console.error(
      '[WHATSAPP COLLECTION] LOAD ERROR:',
      collectionError
    );

    return {
      error:
        'Could not load the saved milk collection.',
    };
  }

  const supplierRelation =
    Array.isArray(collection.suppliers)
      ? collection.suppliers[0]
      : collection.suppliers;

  const farmerName =
    supplierRelation?.name?.trim() ||
    'Farmer';

  const phone =
    normalizeIndianWhatsAppNumber(
      supplierRelation?.mobile
    );

  if (!phone || !isValidIndianWhatsAppNumber(phone)) {
    return {
      error:
        'This farmer does not have a valid Indian mobile number for WhatsApp.',
    };
  }

  const quantity =
    Number(collection.quantity_litres);

  const rate =
    Number(collection.rate_per_litre);

  const totalAmount =
    Number(collection.total_amount);

  if (
    !Number.isFinite(quantity) ||
    quantity < 0 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    !Number.isFinite(totalAmount) ||
    totalAmount < 0
  ) {
    console.error(
      '[WHATSAPP COLLECTION] INVALID COLLECTION NUMBERS:',
      parsedId.data
    );

    return {
      error:
        'The saved collection contains invalid quantity or payment values.',
    };
  }

  /*
   * Approved template body parameters:
   *
   * 1. Farmer name
   * 2. Collection date
   * 3. Milk type
   * 4. Quantity in litres
   * 5. FAT %
   * 6. SNF %
   * 7. Rate per litre
   * 8. Total amount
   */
  const parameters = [
    farmerName,
    String(collection.collection_date),
    formatMilkType(collection.milk_type),
    quantity.toFixed(2),
    collection.fat_percent === null
      ? '—'
      : Number(collection.fat_percent).toFixed(2),
    collection.snf_percent === null
      ? '—'
      : Number(collection.snf_percent).toFixed(2),
    `₹${rate.toFixed(2)}`,
    `₹${totalAmount.toFixed(2)}`,
  ];

  const endpoint =
    `https://graph.facebook.com/${config.data.graphApiVersion}/${config.data.phoneNumberId}/messages`;

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.data.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: config.data.templateName,
          language: {
            code: config.data.templateLanguage,
          },
          components: [
            {
              type: 'body',
              parameters: parameters.map((text) => ({
                type: 'text',
                text,
              })),
            },
          ],
        },
      }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error(
      '[WHATSAPP COLLECTION] NETWORK ERROR:',
      error
    );

    return {
      error:
        'Could not connect to WhatsApp. Please try again.',
    };
  }

  const payload = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    console.error(
      '[WHATSAPP COLLECTION] SEND ERROR:',
      response.status,
      payload
    );

    /**
     * Do not expose the complete WhatsApp API response
     * to the browser because it may contain implementation
     * details that are useful for attackers but unnecessary
     * for the operator.
     */
    if (response.status === 401) {
      return {
        error:
          'WhatsApp authorization failed. Please check the server access token.',
      };
    }

    if (response.status === 403) {
      return {
        error:
          'WhatsApp rejected this request. Please check the phone number or template configuration.',
      };
    }

    if (response.status === 429) {
      return {
        error:
          'WhatsApp rate limit reached. Please wait and try again.',
      };
    }

    const apiMessage =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : null;

    return {
      error:
        apiMessage ||
        'WhatsApp could not send the collection message.',
    };
  }

  const messageId =
    payload?.messages?.[0]?.id ||
    payload?.data?.messages?.[0]?.id ||
    null;

  if (!messageId) {
    console.error(
      '[WHATSAPP COLLECTION] MISSING MESSAGE ID:',
      payload
    );

    return {
      error:
        'WhatsApp accepted the request, but no message ID was returned.',
    };
  }

  return {
    success: true as const,
    messageId,
    phone,
  };
}
