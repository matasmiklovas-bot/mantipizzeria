// Delivery estimates and the Christmas cut-off. All dates are calendar dates
// in Lithuania ("YYYY-MM-DD"), never timestamps, so time zones cannot shift a
// deadline by a day.

import { SETTINGS } from './settings.js';

// Lithuanian public holidays that fall on possible working days in the season.
const HOLIDAYS = new Set(['2026-11-02', '2026-12-24', '2026-12-25', '2026-12-26', '2027-01-01']);

const MONTHS_GENITIVE = [
  'sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio',
  'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio',
];
const WEEKDAYS = ['sekmadienis', 'pirmadienis', 'antradienis', 'trečiadienis', 'ketvirtadienis', 'penktadienis', 'šeštadienis'];

/** Current calendar date in Vilnius as "YYYY-MM-DD". */
export function todayInVilnius(now = currentTime()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Tests may pin the clock; production ignores the override. */
export function currentTime() {
  if (process.env.ALLOW_TEST_HOOKS === '1' && process.env.TEST_NOW) return new Date(process.env.TEST_NOW);
  return new Date();
}

function toUtc(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date) {
  return date.toISOString().slice(0, 10);
}

export function isBusinessDay(dateStr) {
  const day = toUtc(dateStr).getUTCDay();
  return day !== 0 && day !== 6 && !HOLIDAYS.has(dateStr);
}

export function addBusinessDays(dateStr, days) {
  const d = toUtc(dateStr);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isBusinessDay(fromUtc(d))) left--;
  }
  return fromUtc(d);
}

export function subtractBusinessDays(dateStr, days) {
  const d = toUtc(dateStr);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (isBusinessDay(fromUtc(d))) left--;
  }
  return fromUtc(d);
}

export function totalLeadDays(p = SETTINGS.production) {
  return p.creationDays + p.revisionBufferDays + p.printDays + p.deliveryDays;
}

/** Last date on which an order still arrives before Christmas. */
export function lastChristmasOrderDate(settings = SETTINGS) {
  return subtractBusinessDays(settings.christmas.deliverBy, totalLeadDays(settings.production));
}

/**
 * @returns {{ today: string, lastOrderDate: string, beforeChristmas: boolean, seasonOver: boolean, estimatedDelivery: string, leadDays: number }}
 */
export function deliveryStatus(now = currentTime(), settings = SETTINGS) {
  const today = todayInVilnius(now);
  const lastOrderDate = lastChristmasOrderDate(settings);
  const leadDays = totalLeadDays(settings.production);
  return {
    today,
    lastOrderDate,
    beforeChristmas: today <= lastOrderDate,
    // After Christmas itself the banner is no longer relevant.
    seasonOver: today > '2026-12-26',
    estimatedDelivery: addBusinessDays(today, leadDays),
    leadDays,
  };
}

/** "2026-12-11" -> "gruodžio 11 d." */
export function formatDate(dateStr) {
  const d = toUtc(dateStr);
  return `${MONTHS_GENITIVE[d.getUTCMonth()]} ${d.getUTCDate()} d.`;
}

/** "2026-12-11" -> "gruodžio 11 d. (penktadienis)" */
export function formatDateLong(dateStr) {
  return `${formatDate(dateStr)} (${WEEKDAYS[toUtc(dateStr).getUTCDay()]})`;
}

/** ISO timestamp -> "2026-11-18 14:05" in Vilnius time. */
export function formatDateTime(iso) {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
  return parts;
}
