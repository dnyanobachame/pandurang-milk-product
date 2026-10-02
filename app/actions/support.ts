
'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const SUPPORT_ROLES = [
  'admin',
  'customer_support',
] as const;

const TicketIdSchema = z.string().uuid(
  'Invalid ticket ID.'
);

const CreateSupportTicketSchema = z.object({
  orderId: z
    .string()
    .uuid('Invalid order reference.')
    .optional(),

  category: z
    .string()
    .trim()
    .min(1, 'Please select a support category.')
    .max(80, 'Support category is too long.'),

  description: z
    .string()
    .trim()
    .min(1, 'Please describe the issue.')
    .max(
      5000,
      'Description cannot exceed 5,000 characters.'
    ),
});

const ResolutionSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a resolution.')
  .max(
    5000,
    'Resolution cannot exceed 5,000 characters.'
  );

function generateTicketNumber() {
  const suffix = randomBytes(4)
    .toString('hex')
    .toUpperCase();

  return `TKT-${Date.now()
    .toString(36)
    .toUpperCase()}-${suffix}`;
}

async function requireAuthenticatedUser() {
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

  return {
    supabase,
    user,
  };
}

async function requireSupportStaff() {
  const auth =
    await requireAuthenticatedUser();

  if ('error' in auth) {
    return auth;
  }

  const {
    data: profile,
    error: profileError,
  } =
    await auth.supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', auth.user.id)
      .single();

  if (
    profileError ||
    !profile ||
    profile.is_active !== true ||
    !SUPPORT_ROLES.includes(
      profile.role as (typeof SUPPORT_ROLES)[number]
    )
  ) {
    return {
      error:
        'You are not authorized to manage support tickets.' as const,
    };
  }

  return {
    ...auth,
    role: profile.role,
  };
}

export async function createSupportTicket(input: {
  orderId?: string;
  category: string;
  description: string;
}) {
  const auth =
    await requireAuthenticatedUser();

  if ('error' in auth) {
    return auth;
  }

  const parsed =
    CreateSupportTicketSchema.safeParse({
      orderId:
        input?.orderId?.trim() || undefined,
      category: input?.category,
      description: input?.description,
    });

  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ??
        'Invalid support request.',
    };
  }

  const orderId =
    parsed.data.orderId ?? null;

  /**
   * If an order is supplied, verify that it belongs
   * to the currently authenticated customer.
   *
   * This prevents a customer from attaching another
   * customer's order ID to a support ticket.
   */
  if (orderId) {
    const {
      data: order,
      error: orderError,
    } =
      await auth.supabase
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .eq('customer_id', auth.user.id)
        .maybeSingle();

    if (orderError) {
      console.error(
        '[support] order ownership check failed:',
        orderError.message
      );

      return {
        error:
          'Could not verify the selected order.',
      };
    }

    if (!order) {
      return {
        error:
          'The selected order was not found or does not belong to you.',
      };
    }
  }

  const ticketNumber =
    generateTicketNumber();

  const {
    error: insertError,
  } =
    await auth.supabase
      .from('support_tickets')
      .insert({
        ticket_number: ticketNumber,
        customer_id: auth.user.id,
        order_id: orderId,
        category: parsed.data.category,
        description:
          parsed.data.description,
        status: 'open',
      });

  if (insertError) {
    console.error(
      '[support] ticket creation failed:',
      insertError.message
    );

    if (insertError.code === '23505') {
      return {
        error:
          'Could not create a unique support ticket. Please try again.',
      };
    }

    return {
      error:
        'Could not submit your request. Please try again.',
    };
  }

  revalidatePath('/dashboard/support');

  redirect('/dashboard/support');
}

export async function resolveTicket(
  ticketId: string,
  resolution: string
) {
  const auth =
    await requireSupportStaff();

  if ('error' in auth) {
    return auth;
  }

  const parsedTicketId =
    TicketIdSchema.safeParse(
      String(ticketId ?? '').trim()
    );

  if (!parsedTicketId.success) {
    return {
      error: 'Ticket ID is invalid.',
    };
  }

  const parsedResolution =
    ResolutionSchema.safeParse(
      resolution
    );

  if (!parsedResolution.success) {
    return {
      error:
        parsedResolution.error.errors[0]
          ?.message ??
        'Please enter a valid resolution.',
    };
  }

  /**
   * Load the current ticket state before resolving it.
   */
  const {
    data: ticket,
    error: ticketError,
  } =
    await auth.supabase
      .from('support_tickets')
      .select(
        'id, status, customer_id'
      )
      .eq(
        'id',
        parsedTicketId.data
      )
      .maybeSingle();

  if (ticketError) {
    console.error(
      '[support] ticket lookup failed:',
      ticketError.message
    );

    return {
      error:
        'Could not load this support ticket.',
    };
  }

  if (!ticket) {
    return {
      error: 'Support ticket not found.',
    };
  }

  /**
   * Avoid rewriting an already resolved ticket.
   */
  if (ticket.status === 'resolved') {
    return {
      error:
        'This support ticket has already been resolved.',
    };
  }

  /**
   * Only transition an open ticket that still has
   * the status we observed above.
   */
  const {
    data: updated,
    error: updateError,
  } =
    await auth.supabase
      .from('support_tickets')
      .update({
        status: 'resolved',
        resolution:
          parsedResolution.data,
        assigned_to: auth.user.id,
      })
      .eq(
        'id',
        parsedTicketId.data
      )
      .eq('status', ticket.status)
      .select('id')
      .maybeSingle();

  if (updateError) {
    console.error(
      '[support] ticket resolution failed:',
      updateError.message
    );

    return {
      error:
        'Could not resolve this ticket.',
    };
  }

  if (!updated) {
    return {
      error:
        'This ticket was changed before the request completed. Please refresh and try again.',
    };
  }

  revalidatePath('/admin/support');
  revalidatePath(
    `/admin/support/${parsedTicketId.data}`
  );
  revalidatePath('/dashboard/support');

  if (ticket.customer_id) {
    revalidatePath(
      `/dashboard/support/${parsedTicketId.data}`
    );
  }

  return {
    ok: true,
  };
}
