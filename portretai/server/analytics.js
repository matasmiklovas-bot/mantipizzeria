// Cookieless, first-party visit counter. It stores the event name, the page
// path, the referring site's host name and the utm_source value. No IP
// address, no cookie, no identifier, so no consent banner is needed for it.

import { db } from './db.js';
import { currentTime, todayInVilnius } from './deadline.js';

export const EVENT_NAMES = ['page', 'order_start', 'photo_ok', 'photo_rejected', 'details_done', 'checkout'];

const BOT_RE = /bot|crawl|spider|slurp|preview|monitor|lighthouse|headless/i;

export async function trackEvent({ name, path, referrer, source, userAgent }) {
  if (!EVENT_NAMES.includes(name)) return false;
  if (userAgent && BOT_RE.test(userAgent)) return false;
  let ref = null;
  try {
    ref = referrer ? new URL(referrer).hostname.slice(0, 80) : null;
  } catch {
    ref = null;
  }
  await (await db()).insertSiteEvent({
    at: currentTime().toISOString(),
    name,
    path: typeof path === 'string' ? path.split('?')[0].slice(0, 120) : null,
    ref,
    source: typeof source === 'string' ? source.replace(/[^a-z0-9_.-]/gi, '').slice(0, 40) || null : null,
  });
  return true;
}

/** Per-day counts for the last `days` days, newest first. */
export async function eventSummary(days = 14) {
  const since = new Date(currentTime().getTime() - days * 24 * 3600 * 1000);
  const events = await (await db()).listSiteEvents(since.toISOString());
  const byDay = new Map();
  const sources = new Map();
  for (const e of events) {
    const day = todayInVilnius(new Date(e.at));
    if (!byDay.has(day)) byDay.set(day, Object.fromEntries(EVENT_NAMES.map((n) => [n, 0])));
    byDay.get(day)[e.name] = (byDay.get(day)[e.name] || 0) + 1;
    if (e.name === 'page' && e.path === '/') {
      const key = e.source || e.ref || 'tiesiogiai';
      sources.set(key, (sources.get(key) || 0) + 1);
    }
  }
  return {
    days: [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, counts]) => ({ day, ...counts })),
    sources: [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([source, count]) => ({ source, count })),
  };
}
