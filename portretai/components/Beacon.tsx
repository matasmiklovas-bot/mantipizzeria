'use client';

// Cookieless visit counter: sends the page path, the referring site and
// utm_source. No identifier is created or stored in the browser.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function track(name: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    const body = JSON.stringify({
      name,
      path: window.location.pathname,
      referrer: document.referrer || null,
      source: params.get('utm_source'),
    });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/ivykis', new Blob([body], { type: 'application/json' }));
    else void fetch('/api/ivykis', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
  } catch {
    // Counting visits must never break the page.
  }
}

export default function Beacon() {
  const pathname = usePathname();
  useEffect(() => {
    // Admin and private order pages are not counted.
    if (/^\/(valdymas|perziura|kuponas|bandymas)/.test(pathname)) return;
    track('page');
  }, [pathname]);
  return null;
}
