'use client';

// Meta and TikTok pixels. OFF by default: nothing here loads, and no consent
// banner appears, until NEXT_PUBLIC_META_PIXEL_ID or
// NEXT_PUBLIC_TIKTOK_PIXEL_ID is set in the hosting settings. Even then the
// scripts load only after the visitor presses "Sutinku".
//
// STATUS: the loader snippets follow the vendors' published base code and
// have not been run against real pixel IDs.
// TODO(savininkas): when you start paid ads, set the IDs and check in the
// Meta / TikTok event tools that page views arrive.

import { useEffect, useState } from 'react';

const META_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const TIKTOK_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '';
const KEY = 'sutikimas-reklamai';

function loadMeta(id: string) {
  const w = window as any;
  if (w.fbq) return;
  const fbq: any = function (...args: unknown[]) {
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue.push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  w.fbq = fbq;
  w._fbq = fbq;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  fbq('init', id);
  fbq('track', 'PageView');
}

function loadTikTok(id: string) {
  const w = window as any;
  if (w.ttq) return;
  const ttq: any = (w.ttq = []);
  ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
  ttq.setAndDefer = (t: any, e: string) => {
    t[e] = (...args: unknown[]) => t.push([e, ...args]);
  };
  for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`;
  document.head.appendChild(s);
  ttq.page();
}

export default function Pixels() {
  const enabled = Boolean(META_ID || TIKTOK_ID);
  const [choice, setChoice] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'yes' || saved === 'no') setChoice(saved);
    setReady(true);
  }, [enabled]);

  useEffect(() => {
    if (choice !== 'yes') return;
    if (META_ID) loadMeta(META_ID);
    if (TIKTOK_ID) loadTikTok(TIKTOK_ID);
  }, [choice]);

  if (!enabled || !ready || choice !== 'unknown') return null;

  const decide = (value: 'yes' | 'no') => {
    window.localStorage.setItem(KEY, value);
    setChoice(value);
  };

  return (
    <div className="consent" role="dialog" aria-label="Sutikimas dėl reklamos slapukų">
      <div>
        Ar leidžiate naudoti „Meta“ ir „TikTok“ slapukus, kad matytume, kuri reklama atvedė į svetainę? Be jų svetainė veikia taip pat.
        <button type="button" className="btn accent small" onClick={() => decide('yes')}>
          Sutinku
        </button>
        <button type="button" className="btn ghost small" style={{ color: '#fff', borderColor: '#fff' }} onClick={() => decide('no')}>
          Nesutinku
        </button>
      </div>
    </div>
  );
}
