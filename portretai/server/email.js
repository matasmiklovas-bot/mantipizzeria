// Sending email.
//   resend – production (https://resend.com HTTP API)
//   outbox – development and tests: messages are appended to .data/outbox.json
//
// STATUS of the resend driver: written from Resend's public API description,
// not yet run against the live service.
// TODO(savininkas): send one real test order before launch.

import fs from 'node:fs';
import path from 'node:path';
import { dataDir, driverFor } from './env.js';
import { contactEmail } from './settings.js';

export function outboxFile() {
  return path.join(dataDir(), 'outbox.json');
}

export function readOutbox() {
  try {
    return JSON.parse(fs.readFileSync(outboxFile(), 'utf8'));
  } catch {
    return [];
  }
}

async function sendViaOutbox(message) {
  if (process.env.TEST_EMAIL_FAIL === '1' && process.env.ALLOW_TEST_HOOKS === '1') throw new Error('Simulated email failure');
  const all = readOutbox();
  all.push({ ...message, at: new Date().toISOString() });
  fs.mkdirSync(path.dirname(outboxFile()), { recursive: true });
  fs.writeFileSync(outboxFile(), JSON.stringify(all, null, 1));
  return { id: `outbox-${all.length}` };
}

async function sendViaResend(message, fetchFn = fetch) {
  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${text.slice(0, 300)}`);
  try {
    return { id: JSON.parse(text).id };
  } catch {
    return { id: null };
  }
}

/**
 * @param {{ to: string, subject: string, html: string, text: string, kind: string, orderId?: string }} message
 */
export async function sendEmail(message, opts = {}) {
  if (!message.to) throw new Error('Email has no recipient.');
  const full = { replyTo: contactEmail() || undefined, ...message };
  return driverFor('email') === 'resend' ? sendViaResend(full, opts.fetch) : sendViaOutbox(full);
}

export function ownerEmail() {
  return process.env.OWNER_EMAIL || contactEmail();
}
