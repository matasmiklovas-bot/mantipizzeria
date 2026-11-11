// Signing helpers for the admin session cookie and local upload URLs.

import crypto from 'node:crypto';
import { testHooksAllowed } from './env.js';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== 'production' || testHooksAllowed()) return s || 'development-only-secret-not-for-production';
  throw new Error('SESSION_SECRET must be set to at least 32 random characters.');
}

export function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function verify(value, signature) {
  return typeof signature === 'string' && safeEqual(sign(value), signature);
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Short order code that is easy to read aloud: no 0/O or 1/I. */
export function orderCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// --- Admin session -----------------------------------------------------

const SESSION_DAYS = 7;
export const SESSION_COOKIE = 'valdymas';

export function createSession(now = Date.now()) {
  const expires = now + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { value: `${expires}.${sign(`session:${expires}`)}`, maxAge: SESSION_DAYS * 24 * 60 * 60 };
}

export function isValidSession(value, now = Date.now()) {
  if (typeof value !== 'string') return false;
  const dot = value.indexOf('.');
  if (dot < 1) return false;
  const expires = Number(value.slice(0, dot));
  if (!Number.isFinite(expires) || expires < now) return false;
  return verify(`session:${expires}`, value.slice(dot + 1));
}

export function checkAdminPassword(input) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 10) return false;
  return typeof input === 'string' && safeEqual(sign(`pw:${input}`), sign(`pw:${expected}`));
}
