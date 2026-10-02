'use client';

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let cancelled = false;

    const registerServiceWorker = async () => {
      try {
        if (cancelled) {
          return;
        }

        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // Non-fatal — the app still works without offline caching/push.
      }
    };

    void registerServiceWorker();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}