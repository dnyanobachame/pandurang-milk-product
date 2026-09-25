/**
 * Web Push sender. Server-only — VAPID_PRIVATE_KEY must never reach the
 * client. The public key (NEXT_PUBLIC_VAPID_PUBLIC_KEY) is safe to expose;
 * it's what the browser uses to open a push subscription.
 */
import webpush from 'web-push';

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@example.com',
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string };

/**
 * Sends to one subscription. Returns `expired: true` on a 404/410 from the
 * push service so the caller can delete the stale row — subscriptions
 * expire silently on the browser side (uninstall, permission revoked,
 * storage cleared) and there's no other way to detect that.
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
): Promise<{ ok: boolean; expired?: boolean }> {
  if (!ensureConfigured()) return { ok: false };

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      return { ok: false, expired: true };
    }
    return { ok: false };
  }
}
