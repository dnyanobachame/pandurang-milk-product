'use client';

import { useEffect, useState } from 'react';
import { savePushSubscription, removePushSubscription } from '@/app/actions/notifications-settings';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushSubscribeToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setSupported(true);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function subscribe() {
    setError(null);
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError('Push notifications are not configured yet.');
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission was not granted.');
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const result = await savePushSubscription(json);
      if (result?.error) {
        setError(result.error);
      } else {
        setSubscribed(true);
      }
    } catch {
      setError('Could not enable push notifications on this device.');
    }
    setLoading(false);
  }

  async function unsubscribe() {
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError('Could not disable push notifications.');
    }
    setLoading(false);
  }

  if (!supported) {
    return <p className="text-sm text-gray-500">Push notifications aren&apos;t supported on this browser.</p>;
  }

  return (
    <div>
      <button
        onClick={subscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`text-sm rounded-full px-4 py-2 font-medium disabled:opacity-60 ${
          subscribed ? 'border border-gray-200 text-gray-700' : 'bg-brand-600 text-white'
        }`}
      >
        {loading ? 'Please wait…' : subscribed ? 'Disable push notifications' : 'Enable push notifications'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
