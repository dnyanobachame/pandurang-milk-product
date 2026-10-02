'use client';

import { useEffect, useState } from 'react';
import {
  savePushSubscription,
  removePushSubscription,
} from '@/app/actions/notifications-settings';

function urlBase64ToUint8Array(base64String: string) {
  const padding =
    '='.repeat((4 - (base64String.length % 4)) % 4);

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);

  return Uint8Array.from(
    Array.from(rawData).map((character) =>
      character.charCodeAt(0)
    )
  );
}

export function PushSubscribeToggle() {
  const [supported, setSupported] = useState<boolean | null>(
    null
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSubscription() {
      const isSupported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!mounted) return;

      setSupported(isSupported);

      if (!isSupported) {
        return;
      }

      try {
        const registration =
          await navigator.serviceWorker.ready;

        const subscription =
          await registration.pushManager.getSubscription();

        if (mounted) {
          setSubscribed(Boolean(subscription));
        }
      } catch {
        if (mounted) {
          setError(
            'Could not check push notification status.'
          );
        }
      }
    }

    void checkSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  async function subscribe() {
    if (loading) return;

    setError(null);

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      setError(
        'Push notifications are not configured yet.'
      );
      return;
    }

    if (!supported) {
      setError(
        'Push notifications are not supported on this browser.'
      );
      return;
    }

    setLoading(true);

    try {
      const permission =
        await Notification.requestPermission();

      if (permission !== 'granted') {
        setError(
          permission === 'denied'
            ? 'Notifications are blocked for this site. Please allow them in your browser settings.'
            : 'Notification permission was not granted.'
        );
        return;
      }

      const registration =
        await navigator.serviceWorker.ready;

      const existingSubscription =
        await registration.pushManager.getSubscription();

      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(publicKey),
        }));

      const json = subscription.toJSON();

      if (
        !json.endpoint ||
        !json.keys?.p256dh ||
        !json.keys?.auth
      ) {
        setError(
          'The browser returned an invalid push subscription.'
        );
        return;
      }

      const result = await savePushSubscription({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setSubscribed(true);
    } catch {
      setError(
        'Could not enable push notifications on this device.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const registration =
        await navigator.serviceWorker.ready;

      const subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        setSubscribed(false);
        return;
      }

      const result = await removePushSubscription(
        subscription.endpoint
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      const unsubscribed =
        await subscription.unsubscribe();

      if (!unsubscribed) {
        setError(
          'Could not disable push notifications on this device.'
        );
        return;
      }

      setSubscribed(false);
    } catch {
      setError(
        'Could not disable push notifications.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (supported === null) {
    return (
      <p className="text-sm text-gray-500">
        Checking notification support…
      </p>
    );
  }

  if (!supported) {
    return (
      <p className="text-sm leading-5 text-gray-500">
        Push notifications aren&apos;t supported on this
        browser.
      </p>
    );
  }

  return (
    <div className="w-full min-w-0">
      <button
        type="button"
        onClick={
          subscribed ? unsubscribe : subscribe
        }
        disabled={loading}
        aria-busy={loading}
        aria-pressed={subscribed}
        className={`min-h-11 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
          subscribed
            ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            : 'bg-brand-600 text-white hover:bg-brand-700'
        }`}
      >
        {loading
          ? 'Please wait…'
          : subscribed
            ? 'Disable push notifications'
            : 'Enable push notifications'}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-2 text-xs font-medium leading-5 text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}