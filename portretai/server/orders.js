// Order lifecycle. Every state change is a compare-and-set on the order row,
// so a repeated webhook, a double click or two open tabs cannot apply the
// same step twice.
//
//   laukia_apmokejimo → apmoketa → kuriama → laukia_patvirtinimo ⇄ taisoma
//                                                   ↓
//                                              patvirtinta → spaudoje → issiusta
//
// Only an approved portrait version can reach the print shop.

import crypto from 'node:crypto';
import sharp from 'sharp';
import { db } from './db.js';
import { storage } from './storage.js';
import { sendEmail, ownerEmail } from './email.js';
import { templates } from './email-templates.js';
import { createCheckout } from './payments.js';
import { SETTINGS } from './settings.js';
import { deliveryStatus, currentTime } from './deadline.js';
import { randomToken, orderCode } from './crypto.js';
import { checkPhoto } from '../src/validate.js';
import { loadStyle } from '../src/styles.js';
import { getSize } from '../src/config.js';
import { prepareTexts, renderPoster } from '../src/layout.js';
import { buildPrintPdf, inspectPrintPdf } from '../src/pdf.js';
import { buildPreview, trimPoster } from '../src/preview.js';
import { buildProductMockup } from '../src/mockup-products.js';

/** An error whose message is safe and useful to show to the person. */
export class UserError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'UserError';
    this.field = field;
  }
}

const nowIso = () => currentTime().toISOString();

// ---------------------------------------------------------------------------
// Photo upload
// ---------------------------------------------------------------------------

/** Step 1: reserve a place for the customer's photo and return where to upload it. */
export async function createPhotoUpload() {
  const id = crypto.randomUUID();
  const rawKey = `uploads/${id}`;
  const d = await db();
  await d.insertPhoto({ id, rawKey, key: null, status: 'pending', orderId: null, createdAt: nowIso(), width: null, height: null, warnings: [] });
  const upload = await (await storage()).createUpload(rawKey);
  return { photoId: id, upload };
}

/**
 * Step 2: check the uploaded file straight away, so the customer learns about
 * a bad photo before paying. A good photo is re-encoded to JPEG (this also
 * turns HEIC into something every computer opens) and the raw upload is
 * deleted.
 */
export async function confirmPhotoUpload(photoId) {
  const d = await db();
  const s = await storage();
  const photo = await d.getPhoto(String(photoId));
  if (!photo || photo.orderId) throw new UserError('Nuotrauka nerasta. Įkelkite ją iš naujo.');
  if (photo.status === 'ready') {
    const existing = await s.get(photo.key);
    if (!existing) throw new UserError('Nuotrauka nerasta. Įkelkite ją iš naujo.');
    return {
      ok: true, photoId: photo.id, width: photo.width, height: photo.height, warnings: photo.warnings || [], errors: [],
      thumb: await thumbnail(existing), preview: await posterPreview(existing),
    };
  }

  const raw = await s.get(photo.rawKey);
  if (!raw) throw new UserError('Failas nepasiekė serverio. Patikrinkite ryšį ir įkelkite iš naujo.');

  const check = await checkPhoto(raw);
  if (!check.ok) {
    await s.remove([photo.rawKey]);
    await d.deletePhoto(photo.id);
    return { ok: false, photoId: null, errors: check.errors, warnings: check.warnings };
  }

  const stored = await sharp(check.photo.buffer)
    .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });
  const key = `photos/${photo.id}.jpg`;
  await s.put(key, stored.data, 'image/jpeg');
  await s.remove([photo.rawKey]);
  await d.casPhoto(photo.id, { status: 'pending' }, {
    key, rawKey: null, status: 'ready', width: stored.info.width, height: stored.info.height, warnings: check.warnings,
  });
  return {
    ok: true, photoId: photo.id, width: stored.info.width, height: stored.info.height, warnings: check.warnings, errors: [],
    thumb: await thumbnail(stored.data),
    preview: await posterPreview(stored.data),
  };
}

/**
 * The customer's own photo, cropped to the poster's 4:5 portrait area on its
 * most salient part (usually the face), for the live poster preview.
 */
async function posterPreview(buffer) {
  const img = await sharp(buffer)
    .resize({ width: 560, height: 700, fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${img.toString('base64')}`;
}

/** Small inline image so the customer sees which photo was accepted (HEIC cannot be shown by most browsers). */
async function thumbnail(buffer) {
  const small = await sharp(buffer).resize({ width: 192, height: 192, fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
  return `data:image/jpeg;base64,${small.toString('base64')}`;
}

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max) {
  return String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Validates customer input. Throws UserError with the field name. */
export function validateOrderInput(input) {
  const style = clean(input.style, 20);
  const size = clean(input.size, 10);
  const frame = clean(input.frame, 20);
  if (!SETTINGS.styles.includes(style)) throw new UserError('Pasirinkite stilių.', 'style');
  if (!SETTINGS.sizes.includes(size)) throw new UserError('Pasirinkite dydį.', 'size');
  if (!SETTINGS.frames.includes(frame)) throw new UserError('Pasirinkite rėmelio spalvą.', 'frame');

  const name = clean(input.name, 200);
  const secondLine = clean(input.secondLine, 200);
  try {
    prepareTexts(loadStyle(style), name, secondLine);
  } catch (err) {
    throw new UserError(err.message, 'name');
  }

  const customerName = clean(input.customerName, 80);
  if (customerName.length < 2) throw new UserError('Įrašykite savo vardą ir pavardę.', 'customerName');
  const email = clean(input.email, 120).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new UserError('El. pašto adresas neteisingas. Į jį siųsime portreto peržiūrą.', 'email');
  const phone = clean(input.phone, 30);
  if (phone.replace(/\D/g, '').length < 8) throw new UserError('Įrašykite telefono numerį: jo reikia paštomato SMS žinutei.', 'phone');

  const deliveryNetwork = clean(input.deliveryNetwork, 40);
  if (!SETTINGS.lockerNetworks.includes(deliveryNetwork)) throw new UserError('Pasirinkite paštomatų tinklą.', 'deliveryNetwork');
  const deliveryCity = clean(input.deliveryCity, 60);
  if (deliveryCity.length < 2) throw new UserError('Įrašykite miestą.', 'deliveryCity');
  const deliveryAddress = clean(input.deliveryAddress, 120);
  if (deliveryAddress.length < 3) throw new UserError('Įrašykite paštomato adresą arba pavadinimą.', 'deliveryAddress');

  if (input.acceptTerms !== true) throw new UserError('Pažymėkite, kad sutinkate su pirkimo taisyklėmis.', 'acceptTerms');

  return { style, size, frame, name, secondLine, customerName, email, phone, deliveryNetwork, deliveryCity, deliveryAddress };
}

/**
 * Creates an unpaid order and a payment session for it.
 * @returns {Promise<{ order: any, checkoutUrl: string }>}
 */
export async function createOrder(input) {
  const fields = validateOrderInput(input);
  const d = await db();

  // Coming back from a cancelled payment: keep the same order, so there is
  // never a second order for the same photo and a late payment of the first
  // payment page still lands on the right order.
  if (input.resumeToken) {
    const existing = await getOrderByToken(input.resumeToken);
    if (existing && existing.status === 'laukia_apmokejimo') {
      const delivery = deliveryStatus();
      const updated = await d.casOrder(existing.id, { status: 'laukia_apmokejimo' }, {
        ...fields,
        priceCents: SETTINGS.prices[fields.size],
        afterChristmas: !delivery.beforeChristmas,
        estimatedDelivery: delivery.estimatedDelivery,
        termsAcceptedAt: nowIso(),
      });
      if (updated) {
        const checkout = await createCheckout(updated);
        const saved = await d.casOrder(updated.id, { status: 'laukia_apmokejimo' }, { paymentRef: checkout.ref });
        await d.addOrderEvent(updated.id, 'checkout_restarted', { priceCents: updated.priceCents });
        return { order: saved ?? updated, checkoutUrl: checkout.url };
      }
    }
    if (existing && existing.paidAt) throw new UserError('Šis užsakymas jau apmokėtas. Patikrinkite el. paštą.', 'form');
  }

  const photo = await d.getPhoto(String(input.photoId || ''));
  if (!photo || photo.status !== 'ready' || photo.orderId) {
    throw new UserError('Nuotrauka nerasta arba jau panaudota. Įkelkite ją iš naujo.', 'photo');
  }

  const delivery = deliveryStatus();
  const now = nowIso();
  const order = {
    id: crypto.randomUUID(),
    code: orderCode(),
    token: randomToken(),
    status: 'laukia_apmokejimo',
    createdAt: now,
    updatedAt: now,
    ...fields,
    priceCents: SETTINGS.prices[fields.size],
    photoKey: photo.key,
    photoWidth: photo.width,
    photoHeight: photo.height,
    afterChristmas: !delivery.beforeChristmas,
    estimatedDelivery: delivery.estimatedDelivery,
    termsAcceptedAt: now,
    paymentRef: null,
    paidAt: null,
    confirmationSentAt: null,
    portraitVersion: 0,
    portraitKey: null,
    previewKey: null,
    cleanKey: null,
    wallKey: null,
    printKey: null,
    renderReport: null,
    previewSentAt: null,
    approvedVersion: null,
    approvedAt: null,
    revisionCount: 0,
    revisionNotes: [],
    trackingNumber: null,
    shippedAt: null,
    filesPurgedAt: null,
  };

  // Claim the photo first: one photo, one order.
  const claimed = await d.casPhoto(photo.id, { orderId: null, status: 'ready' }, { orderId: order.id });
  if (!claimed) throw new UserError('Nuotrauka jau panaudota kitame užsakyme. Įkelkite ją iš naujo.', 'photo');
  await d.insertOrder(order);

  const checkout = await createCheckout(order);
  const saved = await d.casOrder(order.id, { status: 'laukia_apmokejimo' }, { paymentRef: checkout.ref });
  await d.addOrderEvent(order.id, 'created', { priceCents: order.priceCents });
  return { order: saved ?? order, checkoutUrl: checkout.url };
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

/**
 * Applies a verified payment notification. Safe to call any number of times
 * with the same notification: the order is marked paid once and the
 * confirmation emails are sent once.
 * @param {{ eventId: string, type: string, orderId: string|null, paid: boolean, ref: string|null, amountCents: number|null }} event
 * @returns {Promise<{ result: 'ignored'|'unknown_order'|'amount_mismatch'|'paid_after_cancel'|'paid'|'already_paid' }>}
 */
export async function handlePaymentEvent(event) {
  if (!event.paid || !event.orderId) return { result: 'ignored' };
  const d = await db();
  const order = await d.getOrder(event.orderId);
  if (!order) return { result: 'unknown_order' };

  if (event.amountCents != null && event.amountCents !== order.priceCents) {
    const first = await d.insertPaymentEvent(event.eventId, order.id, 'amount_mismatch');
    if (first) {
      await d.addOrderEvent(order.id, 'payment_amount_mismatch', { expected: order.priceCents, received: event.amountCents });
      await notifyOwner(order, 'ownerPaymentProblem', `Gauta ${event.amountCents / 100} €, o užsakymo kaina ${order.priceCents / 100} €. Užsakymas nepažymėtas apmokėtu.`);
    }
    return { result: 'amount_mismatch' };
  }

  if (order.status === 'atsaukta') {
    const first = await d.insertPaymentEvent(event.eventId, order.id, 'paid_after_cancel');
    if (first) {
      await d.addOrderEvent(order.id, 'payment_after_cancel', { eventId: event.eventId });
      await notifyOwner(order, 'ownerPaymentProblem', 'Gautas mokėjimas už atšauktą užsakymą. Grąžinkite pinigus arba susisiekite su klientu.');
    }
    return { result: 'paid_after_cancel' };
  }

  const transitioned = await d.casOrder(order.id, { status: 'laukia_apmokejimo' }, {
    status: 'apmoketa', paidAt: nowIso(), paymentRef: event.ref ?? order.paymentRef,
  });
  const firstDelivery = await d.insertPaymentEvent(event.eventId, order.id, event.type);
  if (transitioned) await d.addOrderEvent(order.id, 'paid', { eventId: event.eventId });

  const current = transitioned ?? (await d.getOrder(order.id));
  if (!['apmoketa', 'kuriama', 'laukia_patvirtinimo', 'taisoma', 'patvirtinta', 'spaudoje', 'issiusta'].includes(current.status)) {
    return { result: 'ignored' };
  }
  await sendConfirmationOnce(current);
  void firstDelivery;
  return { result: transitioned ? 'paid' : 'already_paid' };
}

/**
 * Claims the "confirmation sent" flag, then sends. If sending fails the claim
 * is released and the error propagates, so the payment provider retries.
 */
async function sendConfirmationOnce(order) {
  const d = await db();
  const claimed = await d.casOrder(order.id, { confirmationSentAt: null }, { confirmationSentAt: nowIso() });
  if (!claimed) return false;
  try {
    await sendEmail({ to: claimed.email, kind: 'orderReceived', orderId: claimed.id, ...templates.orderReceived(claimed) });
  } catch (err) {
    await d.casOrder(order.id, { confirmationSentAt: claimed.confirmationSentAt }, { confirmationSentAt: null });
    await d.addOrderEvent(order.id, 'email_failed', { kind: 'orderReceived', error: String(err.message).slice(0, 300) });
    throw err;
  }
  await notifyOwner(claimed, 'ownerNewOrder');
  return true;
}

/** Owner notifications never block the customer-facing step. */
async function notifyOwner(order, kind, detail) {
  const to = ownerEmail();
  if (!to) return;
  try {
    await sendEmail({ to, kind, orderId: order.id, ...templates[kind](order, detail) });
  } catch (err) {
    const d = await db();
    await d.addOrderEvent(order.id, 'email_failed', { kind, error: String(err.message).slice(0, 300) });
  }
}

async function emailCustomer(order, kind, extra) {
  const d = await db();
  try {
    await sendEmail({ to: order.email, kind, orderId: order.id, ...templates[kind](order, extra) });
    await d.addOrderEvent(order.id, 'email_sent', { kind });
    return true;
  } catch (err) {
    await d.addOrderEvent(order.id, 'email_failed', { kind, error: String(err.message).slice(0, 300) });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Admin steps
// ---------------------------------------------------------------------------

async function mustGet(id) {
  const order = await (await db()).getOrder(String(id));
  if (!order) throw new UserError('Užsakymas nerastas.');
  return order;
}

export async function startWork(id) {
  const d = await db();
  const updated = await d.casOrder(String(id), { status: 'apmoketa' }, { status: 'kuriama' });
  if (!updated) throw new UserError('Pradėti kurti galima tik apmokėtą užsakymą.');
  await d.addOrderEvent(updated.id, 'status', { to: 'kuriama' });
  return updated;
}

const PORTRAIT_ALLOWED = ['apmoketa', 'kuriama', 'taisoma', 'laukia_patvirtinimo'];

/**
 * Takes the portrait the owner made, lays out the poster and stores the
 * preview, the wall mockup and the print PDF as a new version.
 * @param {Buffer} portraitBuffer
 */
export async function setPortrait(id, portraitBuffer) {
  const d = await db();
  const s = await storage();
  const order = await mustGet(id);
  if (!PORTRAIT_ALLOWED.includes(order.status)) {
    throw new UserError(
      ['patvirtinta', 'spaudoje', 'issiusta'].includes(order.status)
        ? 'Portretas jau patvirtintas kliento. Pakeisti jo nebegalima.'
        : 'Portretą galima įkelti tik apmokėtam užsakymui.',
    );
  }

  let meta;
  try {
    meta = await sharp(portraitBuffer).metadata();
  } catch {
    throw new UserError('Įkeltas failas nėra paveikslėlis. Įkelkite PNG arba JPG.');
  }
  if (!meta.width || !meta.height || Math.min(meta.width, meta.height) < 1000) {
    throw new UserError(`Portretas per mažas (${meta.width}×${meta.height} px). Trumpoji kraštinė turi būti bent 1000 px.`);
  }

  const size = getSize(order.size);
  const style = loadStyle(order.style);
  const poster = await renderPoster({ portraitBuffer, size, style, name: order.name, secondLine: order.secondLine });
  const pdf = await buildPrintPdf(poster.png, { title: `${order.code} ${order.name}`, size });
  const inspection = await inspectPrintPdf(pdf, size);
  if (!inspection.ok) {
    const failed = inspection.checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.detail}`).join('; ');
    throw new Error(`Print file failed its check and was not saved: ${failed}`);
  }
  const preview = await buildPreview(poster.png, { bleed: size.bleedPx });
  const cleanJpg = await sharp(await trimPoster(poster.png, size.bleedPx)).resize({ width: 1200 }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const wall = await buildProductMockup(poster.png, size, order.frame);

  const version = order.portraitVersion + 1;
  const base = `orders/${order.id}/v${version}`;
  const keys = {
    portraitKey: `${base}/portretas.${meta.format === 'jpeg' ? 'jpg' : 'png'}`,
    previewKey: `${base}/perziura.jpg`,
    cleanKey: `${base}/plakatas.jpg`,
    wallKey: `${base}/siena.jpg`,
    printKey: `${base}/spauda.pdf`,
  };
  await Promise.all([
    s.put(keys.portraitKey, portraitBuffer, meta.format === 'jpeg' ? 'image/jpeg' : 'image/png'),
    s.put(keys.previewKey, preview, 'image/jpeg'),
    s.put(keys.cleanKey, cleanJpg, 'image/jpeg'),
    s.put(keys.wallKey, wall, 'image/jpeg'),
    s.put(keys.printKey, pdf, 'application/pdf'),
  ]);

  const renderReport = { ...poster.report, printChecks: inspection.checks };
  const updated = await d.casOrder(order.id, { status: PORTRAIT_ALLOWED, portraitVersion: order.portraitVersion }, {
    ...keys,
    portraitVersion: version,
    renderReport,
    // A new portrait is never covered by an earlier approval.
    approvedVersion: null,
    approvedAt: null,
    status: order.status === 'apmoketa' ? 'kuriama' : order.status === 'laukia_patvirtinimo' ? 'kuriama' : order.status,
  });
  if (!updated) {
    await s.remove(Object.values(keys));
    throw new UserError('Užsakymas ką tik pasikeitė. Atnaujinkite puslapį ir bandykite dar kartą.');
  }
  await s.remove([order.portraitKey, order.previewKey, order.cleanKey, order.wallKey, order.printKey]);
  await d.addOrderEvent(order.id, 'portrait_uploaded', { version, warnings: poster.report.warnings });
  return updated;
}

/** Sends the preview to the customer and starts waiting for their answer. */
export async function sendPreview(id) {
  const d = await db();
  const order = await mustGet(id);
  if (!['kuriama', 'taisoma'].includes(order.status) || order.portraitVersion < 1) {
    throw new UserError('Peržiūrą galima siųsti tik įkėlus portretą.');
  }
  const updated = await d.casOrder(order.id, { status: order.status, portraitVersion: order.portraitVersion }, {
    status: 'laukia_patvirtinimo', previewSentAt: nowIso(),
  });
  if (!updated) throw new UserError('Užsakymas ką tik pasikeitė. Atnaujinkite puslapį.');
  const sent = await emailCustomer(updated, 'previewReady');
  if (!sent) {
    await d.casOrder(order.id, { status: 'laukia_patvirtinimo', portraitVersion: order.portraitVersion }, { status: order.status, previewSentAt: order.previewSentAt });
    throw new UserError('Laiško išsiųsti nepavyko, todėl būsena nepakeista. Bandykite dar kartą.');
  }
  await d.addOrderEvent(order.id, 'status', { to: 'laukia_patvirtinimo', version: order.portraitVersion });
  return updated;
}

export async function remindPreview(id) {
  const order = await mustGet(id);
  if (order.status !== 'laukia_patvirtinimo') throw new UserError('Priminti galima tik tada, kai laukiama kliento patvirtinimo.');
  const sent = await emailCustomer(order, 'previewReady', { reminder: true });
  if (!sent) throw new UserError('Priminimo išsiųsti nepavyko. Bandykite dar kartą.');
  return order;
}

export function isApprovedForPrint(order) {
  return (
    ['patvirtinta', 'spaudoje', 'issiusta'].includes(order.status) &&
    order.portraitVersion > 0 &&
    order.approvedVersion === order.portraitVersion &&
    Boolean(order.printKey)
  );
}

export async function markPrinting(id) {
  const d = await db();
  const order = await mustGet(id);
  if (order.status !== 'patvirtinta' || !isApprovedForPrint(order)) {
    throw new UserError('Į spaudą galima atiduoti tik kliento patvirtintą portretą.');
  }
  const updated = await d.casOrder(order.id, { status: 'patvirtinta', approvedVersion: order.portraitVersion, portraitVersion: order.portraitVersion }, { status: 'spaudoje' });
  if (!updated) throw new UserError('Užsakymas ką tik pasikeitė. Atnaujinkite puslapį.');
  await d.addOrderEvent(order.id, 'status', { to: 'spaudoje' });
  await emailCustomer(updated, 'inPrint');
  return updated;
}

export async function markShipped(id, trackingRaw) {
  const d = await db();
  const tracking = clean(trackingRaw, 40);
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{3,39}$/.test(tracking)) {
    throw new UserError('Įrašykite siuntos numerį (raidės ir skaitmenys, bent 4 ženklai).');
  }
  const updated = await d.casOrder(String(id), { status: 'spaudoje' }, { status: 'issiusta', trackingNumber: tracking, shippedAt: nowIso() });
  if (!updated) throw new UserError('Išsiųsti galima tik užsakymą, kuris yra spaudoje.');
  await d.addOrderEvent(updated.id, 'status', { to: 'issiusta', tracking });
  await emailCustomer(updated, 'shipped');
  return updated;
}

export async function cancelOrder(id) {
  const d = await db();
  const order = await mustGet(id);
  if (['issiusta', 'atsaukta'].includes(order.status)) throw new UserError('Šio užsakymo atšaukti nebegalima.');
  const updated = await d.casOrder(order.id, { status: order.status }, { status: 'atsaukta' });
  if (!updated) throw new UserError('Užsakymas ką tik pasikeitė. Atnaujinkite puslapį.');
  await d.addOrderEvent(order.id, 'status', { to: 'atsaukta', from: order.status });
  if (order.paidAt) await emailCustomer(updated, 'cancelled');
  return updated;
}

// ---------------------------------------------------------------------------
// Customer steps (reached through the secret link in the preview email)
// ---------------------------------------------------------------------------

export async function getOrderByToken(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 64) return null;
  return (await db()).getOrderByToken(token);
}

/**
 * The customer accepts exactly the version they were shown.
 * @returns {Promise<{ order: any, already: boolean }>}
 */
export async function approvePreview(token, version) {
  const d = await db();
  const order = await getOrderByToken(token);
  if (!order) throw new UserError('Nuoroda nebegalioja.');
  const v = Number(version);
  if (['patvirtinta', 'spaudoje', 'issiusta'].includes(order.status) && order.approvedVersion === v) return { order, already: true };
  if (order.status !== 'laukia_patvirtinimo') throw new UserError('Šiuo metu portreto patvirtinti negalima. Jei laukiate pataisymo, atsiųsime naują peržiūrą.');
  if (v !== order.portraitVersion) throw new UserError('Peržiūra buvo atnaujinta. Perkraukite puslapį ir peržiūrėkite naują portretą.');

  const updated = await d.casOrder(order.id, { status: 'laukia_patvirtinimo', portraitVersion: v }, {
    status: 'patvirtinta', approvedVersion: v, approvedAt: nowIso(),
  });
  if (!updated) {
    const again = await d.getOrder(order.id);
    if (again?.status === 'patvirtinta' && again.approvedVersion === v) return { order: again, already: true };
    throw new UserError('Nepavyko patvirtinti. Perkraukite puslapį ir bandykite dar kartą.');
  }
  await d.addOrderEvent(order.id, 'approved', { version: v });
  await emailCustomer(updated, 'approved');
  await notifyOwner(updated, 'ownerApproved');
  return { order: updated, already: false };
}

export function revisionsLeft(order) {
  return Math.max(0, SETTINGS.freeRevisions - (order.revisionCount || 0));
}

export async function requestRevision(token, textRaw) {
  const d = await db();
  const order = await getOrderByToken(token);
  if (!order) throw new UserError('Nuoroda nebegalioja.');
  if (order.status === 'taisoma') return { order, already: true };
  if (order.status !== 'laukia_patvirtinimo') throw new UserError('Šiuo metu pataisymo paprašyti negalima.');
  if (revisionsLeft(order) < 1) throw new UserError('Nemokamas pataisymas jau panaudotas. Parašykite mums el. paštu.');
  const text = String(textRaw ?? '').normalize('NFC').trim().slice(0, 1000);
  if (text.length < 5) throw new UserError('Parašykite, ką pataisyti (bent keli žodžiai).');

  const notes = [...(order.revisionNotes || []), { at: nowIso(), text, version: order.portraitVersion }];
  const updated = await d.casOrder(order.id, { status: 'laukia_patvirtinimo', revisionCount: order.revisionCount }, {
    status: 'taisoma', revisionCount: order.revisionCount + 1, revisionNotes: notes,
  });
  if (!updated) {
    const again = await d.getOrder(order.id);
    if (again?.status === 'taisoma') return { order: again, already: true };
    throw new UserError('Nepavyko išsiųsti. Perkraukite puslapį ir bandykite dar kartą.');
  }
  await d.addOrderEvent(order.id, 'revision_requested', { text });
  await emailCustomer(updated, 'revisionReceived');
  await notifyOwner(updated, 'ownerRevision');
  return { order: updated, already: false };
}

// ---------------------------------------------------------------------------
// Files and retention
// ---------------------------------------------------------------------------

const FILE_KINDS = {
  photo: { field: 'photoKey', type: 'image/jpeg', name: (o) => `${o.code}-nuotrauka.jpg` },
  portrait: { field: 'portraitKey', type: null, name: (o) => `${o.code}-portretas` },
  preview: { field: 'previewKey', type: 'image/jpeg', name: (o) => `${o.code}-perziura.jpg` },
  clean: { field: 'cleanKey', type: 'image/jpeg', name: (o) => `${o.code}-plakatas.jpg` },
  wall: { field: 'wallKey', type: 'image/jpeg', name: (o) => `${o.code}-siena.jpg` },
  print: { field: 'printKey', type: 'application/pdf', name: (o) => `${o.code}-spauda.pdf` },
};

/**
 * Reads one of an order's files. The print file is released only for an
 * approved portrait.
 * @returns {Promise<{ data: Buffer, contentType: string, fileName: string } | null>}
 */
export async function readOrderFile(order, kind) {
  const spec = FILE_KINDS[kind];
  if (!spec) return null;
  if (kind === 'print' && !isApprovedForPrint(order)) return null;
  const key = order[spec.field];
  if (!key) return null;
  const data = await (await storage()).get(key);
  if (!data) return null;
  const ext = key.split('.').pop();
  return {
    data,
    contentType: spec.type || (ext === 'jpg' ? 'image/jpeg' : 'image/png'),
    fileName: spec.type ? spec.name(order) : `${spec.name(order)}.${ext}`,
  };
}

/**
 * Deletes what should no longer be kept: abandoned uploads, unpaid orders'
 * photos, and the files of orders shipped or cancelled long ago.
 */
export async function purgeExpired() {
  const d = await db();
  const s = await storage();
  const now = currentTime().getTime();
  const unpaidCutoff = new Date(now - SETTINGS.unpaidRetentionHours * 3600 * 1000).toISOString();
  const keepCutoff = new Date(now - SETTINGS.retentionDays * 24 * 3600 * 1000).toISOString();
  const counts = { uploads: 0, unpaid: 0, finished: 0 };

  for (const photo of await d.listOrphanPhotos(unpaidCutoff)) {
    await s.remove([photo.rawKey, photo.key]);
    await d.deletePhoto(photo.id);
    counts.uploads++;
  }

  for (const order of await d.listOrders({ status: 'laukia_apmokejimo' })) {
    if (order.createdAt >= unpaidCutoff) continue;
    const updated = await d.casOrder(order.id, { status: 'laukia_apmokejimo' }, { status: 'atsaukta', filesPurgedAt: nowIso(), photoKey: null });
    if (!updated) continue;
    await s.remove([order.photoKey]);
    await d.addOrderEvent(order.id, 'status', { to: 'atsaukta', reason: 'unpaid' });
    counts.unpaid++;
  }

  for (const order of await d.listOrders({ status: ['issiusta', 'atsaukta'] })) {
    if (order.filesPurgedAt) continue;
    const finishedAt = order.shippedAt || order.updatedAt;
    if (!finishedAt || finishedAt >= keepCutoff) continue;
    await s.remove([order.photoKey, order.portraitKey, order.previewKey, order.cleanKey, order.wallKey, order.printKey]);
    await d.casOrder(order.id, { status: order.status }, {
      filesPurgedAt: nowIso(), photoKey: null, portraitKey: null, previewKey: null, cleanKey: null, wallKey: null, printKey: null,
    });
    await d.addOrderEvent(order.id, 'files_purged', {});
    counts.finished++;
  }
  return counts;
}
