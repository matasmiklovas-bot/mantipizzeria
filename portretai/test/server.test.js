// Order lifecycle against the local drivers: upload, order, payment
// (including repeated notifications), preview approval, revision, shipping,
// and retention. No network is used.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portretas-server-'));
process.env.DATA_DIR = tmp;
process.env.ALLOW_TEST_HOOKS = '1';
process.env.SITE_URL = 'https://example.test';
process.env.OWNER_EMAIL = 'savininkas@example.test';
process.env.TEST_NOW = '2026-11-18T10:00:00Z';
for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']) delete process.env[k];

const { db } = await import('../server/db.js');
const { storage } = await import('../server/storage.js');
const { readOutbox } = await import('../server/email.js');
const orders = await import('../server/orders.js');
const { parseWebhook, buildFakeWebhook } = await import('../server/payments.js');
const { inspectPrintPdf } = await import('../src/pdf.js');
const { getSize } = await import('../src/config.js');
const deadline = await import('../server/deadline.js');
const { SETTINGS, launchIssues } = await import('../server/settings.js');
const { buildVoucherPdf } = await import('../server/voucher.js');
const { trackEvent, eventSummary } = await import('../server/analytics.js');
const cryptoMod = await import('../server/crypto.js');
const { driverFor } = await import('../server/env.js');

test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

const fx = (name) => path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', name);
const NAME = 'Žąsiukė Ąžuolė';
const emails = (kind, orderId) => readOutbox().filter((m) => m.kind === kind && (!orderId || m.orderId === orderId));

async function uploadPhoto(file = 'sunelis.heic') {
  const { photoId, upload } = await orders.createPhotoUpload();
  assert.match(upload.url, /^\/api\/ikelimas\/failas\?key=uploads/);
  await (await storage()).put(`uploads/${photoId}`, fs.readFileSync(fx(file)));
  return photoId;
}

const input = (photoId, over = {}) => ({
  photoId, name: NAME, secondLine: '2014 – 2026', style: 'akvarele', size: '30x40', frame: 'azuolas',
  customerName: 'Ona Petraitė', email: 'Ona@Example.test', phone: '+370 600 00000',
  deliveryNetwork: 'Omniva', deliveryCity: 'Vilnius', deliveryAddress: 'Ozo g. 25 (Akropolis)', acceptTerms: true, ...over,
});

async function paidOrder(over) {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order } = await orders.createOrder(input(photoId, over));
  const { payload, header } = buildFakeWebhook(order);
  await orders.handlePaymentEvent(parseWebhook(payload, header));
  return (await db()).getOrder(order.id);
}

test('photo: a HEIC upload is checked, converted to JPEG, and the raw file is deleted', async () => {
  const photoId = await uploadPhoto('sunelis.heic');
  const r = await orders.confirmPhotoUpload(photoId);
  assert.equal(r.ok, true, r.errors.join('; '));
  assert.deepEqual([r.width, r.height], [1600, 2000]);
  const s = await storage();
  assert.equal(await s.get(`uploads/${photoId}`), null, 'raw upload must be gone');
  const stored = await s.get(`photos/${photoId}.jpg`);
  assert.deepEqual([stored[0], stored[1]], [0xff, 0xd8], 'stored photo is a JPEG');
  // Confirming twice is harmless.
  assert.equal((await orders.confirmPhotoUpload(photoId)).ok, true);
});

test('photo: a bad photo is refused immediately with the reason, and nothing is kept', async () => {
  const photoId = await uploadPhoto('maza.jpg');
  const r = await orders.confirmPhotoUpload(photoId);
  assert.equal(r.ok, false);
  assert.match(r.errors.join(' '), /Per maža raiška/);
  assert.equal(await (await storage()).get(`uploads/${photoId}`), null);
  assert.equal(await (await db()).getPhoto(photoId), null);
  await assert.rejects(orders.createOrder(input(photoId)), /Nuotrauka nerasta/);
});

test('order input is validated field by field', async () => {
  const ok = input('x');
  const bad = (over, re) => assert.throws(() => orders.validateOrderInput({ ...ok, ...over }), re);
  bad({ name: '' }, /tuščias/);
  bad({ name: 'x'.repeat(31) }, /per ilgas/);
  bad({ name: 'Reksas 🐶' }, /šriftas neturi/);
  bad({ style: 'komiksas' }, /stilių/);
  bad({ size: '50x70' }, /dydį/);
  bad({ frame: 'auksinis' }, /rėmelio/);
  bad({ email: 'ne-pastas' }, /El\. pašto/);
  bad({ phone: '123' }, /telefono/);
  bad({ deliveryNetwork: 'UPS' }, /tinklą/);
  bad({ deliveryCity: '' }, /miestą/);
  bad({ deliveryAddress: '' }, /adresą/);
  bad({ acceptTerms: false }, /taisyklėmis/);
  const v = orders.validateOrderInput(ok);
  assert.equal(v.email, 'ona@example.test');
  assert.equal(v.name, NAME);
});

test('order: price comes from the server, one photo makes one order', async () => {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order, checkoutUrl } = await orders.createOrder({ ...input(photoId), priceCents: 1 });
  assert.equal(order.status, 'laukia_apmokejimo');
  assert.equal(order.priceCents, SETTINGS.prices['30x40']);
  assert.match(checkoutUrl, /\/bandymas\/mokejimas\//);
  assert.equal(emails('orderReceived', order.id).length, 0, 'no email before payment');
  await assert.rejects(orders.createOrder(input(photoId)), /jau panaudota/);
});

test('payment: the same notification twice makes one paid order and one set of emails', async () => {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order } = await orders.createOrder(input(photoId));
  const before = (await (await db()).listOrders()).length;
  const { payload, header } = buildFakeWebhook(order);

  const first = await orders.handlePaymentEvent(parseWebhook(payload, header));
  const second = await orders.handlePaymentEvent(parseWebhook(payload, header));
  // A different event for the same payment (Stripe can send both).
  const other = buildFakeWebhook(order, { eventId: 'evt_other', type: 'checkout.session.async_payment_succeeded' });
  const third = await orders.handlePaymentEvent(parseWebhook(other.payload, other.header));
  // Concurrent deliveries.
  await Promise.all([1, 2, 3].map(() => orders.handlePaymentEvent(parseWebhook(payload, header))));

  assert.equal(first.result, 'paid');
  assert.equal(second.result, 'already_paid');
  assert.equal(third.result, 'already_paid');
  assert.equal((await (await db()).listOrders()).length, before, 'no extra orders');
  const paid = await (await db()).getOrder(order.id);
  assert.equal(paid.status, 'apmoketa');
  assert.equal(emails('orderReceived', order.id).length, 1);
  assert.equal(emails('ownerNewOrder', order.id).length, 1);

  const mail = emails('orderReceived', order.id)[0];
  assert.equal(mail.to, 'ona@example.test');
  assert.ok(mail.subject.includes(NAME) && mail.html.includes(NAME) && mail.text.includes(NAME), 'name with Lithuanian letters in the email');
  assert.ok(mail.html.includes(paid.code));
  assert.equal(emails('ownerNewOrder', order.id)[0].to, 'savininkas@example.test');
});

test('payment: a forged or altered notification is rejected', async () => {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order } = await orders.createOrder(input(photoId));
  const { payload, header } = buildFakeWebhook(order);
  assert.throws(() => parseWebhook(payload, 't=1,v1=deadbeef'));
  assert.throws(() => parseWebhook(payload.replace('"paid"', '"paid" '), header));
  assert.throws(() => parseWebhook(payload, ''));
  assert.equal((await (await db()).getOrder(order.id)).status, 'laukia_apmokejimo');
});

test('payment: unpaid, wrong-amount and unknown-order notifications do not mark anything paid', async () => {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order } = await orders.createOrder(input(photoId));
  const unpaid = buildFakeWebhook(order, { paymentStatus: 'unpaid' });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(unpaid.payload, unpaid.header))).result, 'ignored');
  const cheap = buildFakeWebhook({ ...order, priceCents: 100 });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(cheap.payload, cheap.header))).result, 'amount_mismatch');
  const ghost = buildFakeWebhook({ ...order, id: '00000000-0000-4000-8000-000000000000' });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(ghost.payload, ghost.header))).result, 'unknown_order');
  assert.equal((await (await db()).getOrder(order.id)).status, 'laukia_apmokejimo');
});

test('payment: if the confirmation email fails, the next delivery sends it', async () => {
  const photoId = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(photoId);
  const { order } = await orders.createOrder(input(photoId));
  const { payload, header } = buildFakeWebhook(order);
  process.env.TEST_EMAIL_FAIL = '1';
  await assert.rejects(orders.handlePaymentEvent(parseWebhook(payload, header)), /Simulated email failure/);
  delete process.env.TEST_EMAIL_FAIL;
  assert.equal((await (await db()).getOrder(order.id)).status, 'apmoketa', 'payment is recorded even if email failed');
  assert.equal(emails('orderReceived', order.id).length, 0);
  await orders.handlePaymentEvent(parseWebhook(payload, header));
  await orders.handlePaymentEvent(parseWebhook(payload, header));
  assert.equal(emails('orderReceived', order.id).length, 1);
});

test('full path: portrait → preview → revision → new preview → approval → print → shipped', async () => {
  const d = await db();
  let order = await paidOrder();
  const portrait = fs.readFileSync(fx('portretas.png'));

  // Nothing can be skipped.
  await assert.rejects(orders.sendPreview(order.id), /tik įkėlus portretą/);
  await assert.rejects(orders.markPrinting(order.id), /tik kliento patvirtintą/);
  await assert.rejects(orders.markShipped(order.id, 'CC123456789LT'), /spaudoje/);
  await assert.rejects(orders.approvePreview(order.token, 0), /patvirtinti negalima/);

  order = await orders.setPortrait(order.id, portrait);
  assert.equal(order.status, 'kuriama');
  assert.equal(order.portraitVersion, 1);
  assert.equal(await orders.readOrderFile(order, 'print'), null, 'print file is locked before approval');
  assert.ok(await orders.readOrderFile(order, 'preview'));
  assert.ok(await orders.readOrderFile(order, 'photo'));

  order = await orders.sendPreview(order.id);
  assert.equal(order.status, 'laukia_patvirtinimo');
  const previewMail = emails('previewReady', order.id)[0];
  assert.ok(previewMail.html.includes(`https://example.test/perziura/${order.token}`));
  assert.ok(previewMail.html.includes(NAME));
  await assert.rejects(orders.markPrinting(order.id), /tik kliento patvirtintą/);

  // The customer asks for a change. Only one free revision.
  await assert.rejects(orders.requestRevision(order.token, 'ne'), /bent keli žodžiai/);
  let r = await orders.requestRevision(order.token, 'Ausys per trumpos, o akys turėtų būti gintarinės.');
  assert.equal(r.order.status, 'taisoma');
  assert.equal((await orders.requestRevision(order.token, 'Ausys per trumpos, pakartotinai.')).already, true, 'double submit is harmless');
  assert.equal(emails('revisionReceived', order.id).length, 1);
  assert.equal(emails('ownerRevision', order.id).length, 1);
  assert.ok(emails('ownerRevision', order.id)[0].html.includes('gintarinės'));
  await assert.rejects(orders.approvePreview(order.token, 1), /patvirtinti negalima/);

  order = await orders.setPortrait(order.id, portrait);
  assert.equal(order.portraitVersion, 2);
  order = await orders.sendPreview(order.id);
  assert.equal(emails('previewReady', order.id).length, 2);
  await assert.rejects(orders.requestRevision(order.token, 'Dar vienas pataisymas, prašau.'), /jau panaudotas/);

  // Approving an outdated version is refused; approving the current one works once.
  await assert.rejects(orders.approvePreview(order.token, 1), /buvo atnaujinta/);
  const a1 = await orders.approvePreview(order.token, 2);
  const a2 = await orders.approvePreview(order.token, 2);
  assert.equal(a1.already, false);
  assert.equal(a2.already, true);
  order = await d.getOrder(order.id);
  assert.equal(order.status, 'patvirtinta');
  assert.equal(order.approvedVersion, 2);
  assert.equal(emails('approved', order.id).length, 1);
  assert.equal(emails('ownerApproved', order.id).length, 1);
  await assert.rejects(orders.setPortrait(order.id, portrait), /jau patvirtintas/);

  // The released print file is the real thing.
  const print = await orders.readOrderFile(order, 'print');
  assert.equal(print.contentType, 'application/pdf');
  assert.equal((await inspectPrintPdf(print.data, getSize('30x40'))).ok, true);

  order = await orders.markPrinting(order.id);
  assert.equal(order.status, 'spaudoje');
  await assert.rejects(orders.markPrinting(order.id), /tik kliento patvirtintą/);
  await assert.rejects(orders.markShipped(order.id, '!!'), /siuntos numerį/);
  order = await orders.markShipped(order.id, 'CC123456789LT');
  assert.equal(order.status, 'issiusta');
  const shipped = emails('shipped', order.id);
  assert.equal(shipped.length, 1);
  assert.ok(shipped[0].html.includes('CC123456789LT') && shipped[0].html.includes('Omniva'));
  assert.equal(emails('inPrint', order.id).length, 1);
  await assert.rejects(orders.cancelOrder(order.id), /nebegalima/);

  const log = (await d.listOrderEvents(order.id)).map((e) => e.type);
  for (const type of ['created', 'paid', 'portrait_uploaded', 'revision_requested', 'approved']) assert.ok(log.includes(type), type);
});

test('replacing the portrait after the preview was sent withdraws the old preview', async () => {
  let order = await paidOrder();
  const portrait = fs.readFileSync(fx('portretas.png'));
  await orders.setPortrait(order.id, portrait);
  await orders.sendPreview(order.id);
  order = await orders.setPortrait(order.id, portrait);
  assert.equal(order.status, 'kuriama');
  await assert.rejects(orders.approvePreview(order.token, 1), /patvirtinti negalima/);
  await assert.rejects(orders.setPortrait(order.id, Buffer.from('ne paveikslelis')), /nėra paveikslėlis/);
});

test('secret links: wrong or malformed tokens find nothing', async () => {
  assert.equal(await orders.getOrderByToken('x'), null);
  assert.equal(await orders.getOrderByToken('a'.repeat(32)), null);
  assert.equal(await orders.getOrderByToken(undefined), null);
  await assert.rejects(orders.approvePreview('a'.repeat(32), 1), /nebegalioja/);
});

test('retention: abandoned uploads, unpaid orders and old shipped orders lose their files', async () => {
  const s = await storage();
  const d = await db();
  const orphan = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(orphan);
  const unpaidPhoto = await uploadPhoto('sunelis.jpg');
  await orders.confirmPhotoUpload(unpaidPhoto);
  const { order: unpaid } = await orders.createOrder(input(unpaidPhoto));
  let shipped = await paidOrder();
  await orders.setPortrait(shipped.id, fs.readFileSync(fx('portretas.png')));
  await orders.sendPreview(shipped.id);
  await orders.approvePreview(shipped.token, 1);
  await orders.markPrinting(shipped.id);
  shipped = await orders.markShipped(shipped.id, 'CC000000001LT');

  assert.deepEqual(await orders.purgeExpired(), { uploads: 0, unpaid: 0, finished: 0 }, 'nothing is old yet');

  process.env.TEST_NOW = '2026-11-21T10:00:00Z'; // three days later
  const r1 = await orders.purgeExpired();
  assert.ok(r1.uploads >= 1 && r1.unpaid >= 1);
  assert.equal(r1.finished, 0);
  assert.equal(await s.get(`photos/${orphan}.jpg`), null);
  assert.equal(await s.get(unpaid.photoKey), null);
  assert.equal((await d.getOrder(unpaid.id)).status, 'atsaukta');
  assert.ok(await s.get(shipped.photoKey), 'a recently shipped order keeps its files');

  process.env.TEST_NOW = '2026-12-25T10:00:00Z'; // more than 30 days after shipping
  const r2 = await orders.purgeExpired();
  assert.ok(r2.finished >= 1);
  assert.equal(await s.get(shipped.photoKey), null);
  assert.equal(await s.get(shipped.printKey), null);
  const after = await d.getOrder(shipped.id);
  assert.ok(after.filesPurgedAt);
  assert.equal(after.photoKey, null);
  assert.equal(after.name, NAME, 'the order record itself is kept');
  process.env.TEST_NOW = '2026-11-18T10:00:00Z';
});

test('Christmas deadline is computed from the lead times and flips the order to "after Christmas"', async () => {
  // 1 + 2 + 3 + 2 = 8 business days before 23 December 2026 (a Wednesday).
  assert.equal(deadline.totalLeadDays(), 8);
  assert.equal(deadline.lastChristmasOrderDate(), '2026-12-11');
  assert.equal(deadline.subtractBusinessDays('2026-12-23', 1), '2026-12-22');
  assert.equal(deadline.addBusinessDays('2026-12-23', 1), '2026-12-28', 'skips 24–26 December and the weekend');
  assert.equal(deadline.formatDateLong('2026-12-11'), 'gruodžio 11 d. (penktadienis)');
  // The day is a Vilnius day: 22:30 UTC on the 11th is already the 12th there.
  assert.equal(deadline.deliveryStatus(new Date('2026-12-11T21:30:00Z')).beforeChristmas, true);
  assert.equal(deadline.deliveryStatus(new Date('2026-12-11T22:30:00Z')).beforeChristmas, false);
  const faster = { ...SETTINGS, production: { ...SETTINGS.production, printDays: 1 } };
  assert.equal(deadline.lastChristmasOrderDate(faster), '2026-12-15');

  const early = await paidOrder();
  assert.equal(early.afterChristmas, false);
  process.env.TEST_NOW = '2026-12-14T10:00:00Z';
  const late = await paidOrder();
  process.env.TEST_NOW = '2026-11-18T10:00:00Z';
  assert.equal(late.afterChristmas, true);
  const mail = emails('orderReceived', late.id)[0];
  assert.match(mail.html, /Pristatymas po Kalėdų/);
  assert.ok(mail.html.includes(`/kuponas/${late.token}`));
  assert.ok(!emails('orderReceived', early.id)[0].html.includes('/kuponas/'));

  const pdf = await buildVoucherPdf(late);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 50_000);
});

test('admin session and password checks', () => {
  process.env.ADMIN_PASSWORD = 'ilgas-slaptazodis-123';
  assert.equal(cryptoMod.checkAdminPassword('ilgas-slaptazodis-123'), true);
  assert.equal(cryptoMod.checkAdminPassword('ilgas-slaptazodis-124'), false);
  assert.equal(cryptoMod.checkAdminPassword(''), false);
  process.env.ADMIN_PASSWORD = 'trumpas';
  assert.equal(cryptoMod.checkAdminPassword('trumpas'), false, 'a short password is never accepted');
  const s = cryptoMod.createSession(1_000_000);
  assert.equal(cryptoMod.isValidSession(s.value, 1_000_001), true);
  assert.equal(cryptoMod.isValidSession(s.value, 1_000_000 + 8 * 24 * 3600 * 1000), false, 'expired');
  assert.equal(cryptoMod.isValidSession(s.value.replace(/^\d+/, '9999999999999'), 1_000_001), false, 'tampered expiry');
  assert.equal(cryptoMod.isValidSession('', 1), false);
  assert.equal(cryptoMod.isValidSession(undefined, 1), false);
});

test('production refuses to run on the local stand-ins', () => {
  const env = { NODE_ENV: process.env.NODE_ENV, hooks: process.env.ALLOW_TEST_HOOKS };
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_TEST_HOOKS;
  for (const part of ['data', 'storage', 'email', 'payment']) assert.throws(() => driverFor(part), /production/);
  process.env.NODE_ENV = env.NODE_ENV;
  process.env.ALLOW_TEST_HOOKS = env.hooks;
  assert.equal(driverFor('data'), 'local');
  assert.ok(launchIssues({}).some((i) => i.blocking && /rekvizitai/.test(i.text)));
  assert.ok(launchIssues({ STRIPE_SECRET_KEY: 'sk_test_x' }).some((i) => /bandomasis/.test(i.text)));
});

test('visit counter stores no identifiers and ignores bots and unknown events', async () => {
  assert.equal(await trackEvent({ name: 'page', path: '/?fbclid=abc', referrer: 'https://www.tiktok.com/@x/video/1', source: 'tiktok', userAgent: 'Mozilla/5.0 (iPhone)' }), true);
  assert.equal(await trackEvent({ name: 'page', path: '/', userAgent: 'Googlebot/2.1' }), false);
  assert.equal(await trackEvent({ name: 'purchase_hack', path: '/' }), false);
  const stored = JSON.parse(fs.readFileSync(path.join(tmp, 'db.json'), 'utf8')).siteEvents.at(-1);
  assert.deepEqual(Object.keys(stored).sort(), ['at', 'name', 'path', 'ref', 'source']);
  assert.equal(stored.path, '/');
  assert.equal(stored.ref, 'www.tiktok.com');
  const summary = await eventSummary(14);
  assert.equal(summary.days[0].page, 1);
  assert.equal(summary.sources[0].source, 'tiktok');
});

test('cancelled payment: paying again reuses the same order; a payment for a cancelled order alerts the owner', async () => {
  const d = await db();
  const photoId = await uploadPhoto('sunelis.jpg');
  const confirmed = await orders.confirmPhotoUpload(photoId);
  assert.match(confirmed.thumb, /^data:image\/jpeg;base64,/);
  const first = await orders.createOrder(input(photoId));
  const count = (await d.listOrders()).length;

  // Back from the payment page: same photo, changed size.
  const again = await orders.createOrder({ ...input(photoId, { size: 'a4' }), resumeToken: first.order.token });
  assert.equal(again.order.id, first.order.id);
  assert.equal(again.order.priceCents, SETTINGS.prices.a4);
  assert.equal((await d.listOrders()).length, count, 'no second order');

  // The old payment page (old price) is paid: flagged, not accepted.
  const stale = buildFakeWebhook(first.order, { eventId: 'evt_stale' });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(stale.payload, stale.header))).result, 'amount_mismatch');
  assert.equal(emails('ownerPaymentProblem', first.order.id).length, 1);

  const fresh = buildFakeWebhook(again.order, { eventId: 'evt_fresh' });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(fresh.payload, fresh.header))).result, 'paid');
  await assert.rejects(orders.createOrder({ ...input(photoId), resumeToken: first.order.token }), /jau apmokėtas/);

  const other = await paidOrder();
  await orders.cancelOrder(other.id);
  assert.equal(emails('cancelled', other.id).length, 1);
  const late = buildFakeWebhook(other, { eventId: 'evt_late' });
  assert.equal((await orders.handlePaymentEvent(parseWebhook(late.payload, late.header))).result, 'paid_after_cancel');
  assert.equal((await orders.handlePaymentEvent(parseWebhook(late.payload, late.header))).result, 'paid_after_cancel');
  assert.equal(emails('ownerPaymentProblem', other.id).length, 1, 'owner alerted once');
});
