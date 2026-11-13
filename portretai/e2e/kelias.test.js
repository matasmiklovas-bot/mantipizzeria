// End-to-end test of the whole order path in a real browser at phone size:
// home page → upload → name → style → delivery → payment → admin → preview
// approval → revision → print → shipped.
//
// Runs against a production build started on a local port with the local
// stand-ins (JSON file database, files on disk, outbox instead of email,
// stand-in payment page that sends the same signed webhook as Stripe).
//
// Run with:  npm run test:e2e
// Needs Playwright with a Chromium browser available to Node.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fx = (name) => path.join(root, 'test', 'fixtures', name);
const NAME = 'Žąsiukė Ąžuolė';
const PASSWORD = 'bandomasis-slaptazodis';
const PHONE = { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startSite(extraEnv = {}) {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portretas-e2e-'));
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    ALLOW_TEST_HOOKS: '1',
    DATA_DIR: dataDir,
    SITE_URL: base,
    ADMIN_PASSWORD: PASSWORD,
    SESSION_SECRET: 'e2e-secret-0123456789abcdef0123456789',
    OWNER_EMAIL: 'savininkas@example.test',
    TEST_NOW: '2026-11-18T10:00:00Z',
    ...extraEnv,
  };
  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM']) delete env[k];
  const child = spawn(process.execPath, [path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(base + '/taisykles')).ok) break;
    } catch {
      // not up yet
    }
    if (child.exitCode != null) throw new Error(`Site failed to start. Run "npx next build" first.\n${log}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  return {
    base,
    dataDir,
    log: () => log,
    db: () => JSON.parse(fs.readFileSync(path.join(dataDir, 'db.json'), 'utf8')),
    outbox: () => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dataDir, 'outbox.json'), 'utf8'));
      } catch {
        return [];
      }
    },
    stop: async () => {
      child.kill('SIGTERM');
      await new Promise((r) => child.once('exit', r));
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

let site;
let browser;
let customer; // browser context of the customer
let admin; // browser context of the owner
let order; // order row as stored
const consoleErrors = [];

test.before(async () => {
  site = await startSite();
  browser = await chromium.launch();
  customer = await browser.newContext(PHONE);
  admin = await browser.newContext(PHONE);
});

test.after(async () => {
  await browser?.close();
  await site?.stop();
});

const mails = (kind) => site.outbox().filter((m) => m.kind === kind && (!order || m.orderId === order.id));
const refreshOrder = () => (order = site.db().orders.find((o) => o.id === order.id));

function watch(page) {
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  page.on('console', (m) => {
    // A 400 answer to a deliberately invalid form is expected; the browser logs it.
    if (m.type() === 'error' && !/status of 400/.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`);
  });
  return page;
}

test('home page: example, price, lead time and order button are on the first screen of a small phone', async () => {
  const page = watch(await customer.newPage());
  await page.goto(site.base + '/', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('h1').innerText(), 'Jūsų šuns ar katės portretas su vardu');
  // The demo banner exists only on stand-ins; production has no banner, so
  // measure the fold as production visitors see it.
  const banner = await page.locator('.demo-banner').boundingBox();
  const fold = 667 + (banner ? banner.height : 0);
  for (const [what, locator] of [
    ['example', page.locator('.hero .pair')],
    ['price', page.locator('.hero .facts')],
    ['order button', page.locator('.hero a.btn')],
  ]) {
    const box = await locator.boundingBox();
    assert.ok(box && box.y + box.height <= fold, `${what} ends at ${box && box.y + box.height}px, below the ${fold}px fold`);
  }
  assert.match(await page.locator('.hero .facts').innerText(), /nuo 29 €/i);
  assert.match(await page.locator('.hero .facts').innerText(), /per 8 darbo d\./i);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'no sideways scrolling');

  const body = await page.locator('main').innerText();
  assert.match(body, /Kalėdoms: užsakykite iki gruodžio 11 d\./);
  assert.equal(await page.locator('.faq details').count(), 6);
  // The examples are one dog in three styles: its photo is shown once, not three times.
  assert.equal(await page.locator('.trio-strip li').count(), 3);
  assert.equal(await page.locator('.trio img[src$="-nuotrauka.jpg"]').count(), 1);
  // No stock photos and no fake social proof.
  assert.equal(await page.locator('img[src*="unsplash"], img[src*="pexels"], img[src*="stock"]').count(), 0);
  assert.doesNotMatch(body, /atsiliepim|liko \d+ vnt|unikal|aukščiausios kokybės|nepamiršt|pasinerk|tapyta ranka/i);
  // No cookies are set for visitors.
  assert.deepEqual(await customer.cookies(), []);
  await page.close();
});

test('tablet (iPad, both orientations): no sideways scrolling, order button on the first screen', async () => {
  for (const [w, h] of [[810, 1080], [1080, 810], [768, 1024]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true });
    const page = watch(await ctx.newPage());
    for (const url of ['/', '/uzsakymas', '/taisykles']) {
      await page.goto(site.base + url, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${w}×${h} ${url}: sideways scrolling`);
    }
    await page.goto(site.base + '/', { waitUntil: 'networkidle' });
    const box = await page.locator('.hero a.btn').boundingBox();
    assert.ok(box.y + box.height <= h, `${w}×${h}: order button below the fold`);
    await ctx.close();
  }
});

test('legal pages are drafts, marked as needing the owner’s review', async () => {
  const page = watch(await customer.newPage());
  for (const [url, heading] of [['/taisykles', 'Pirkimo taisyklės'], ['/grazinimas', 'Grąžinimas ir brokas'], ['/privatumas', 'Privatumo politika']]) {
    await page.goto(site.base + url);
    assert.equal(await page.locator('h1').innerText(), heading);
    assert.match(await page.locator('.draft').innerText(), /reikia savininko peržiūros/);
    assert.match(await page.locator('.draft').innerText(), /nėra teisinė konsultacija/);
  }
  assert.match(await page.locator('main').innerText(), /TODO\(savininkas\)/);
  await page.close();
});

test('order: a bad photo is refused at once, a HEIC photo is accepted, the name is previewed in the poster typeface', async () => {
  const page = watch(await customer.newPage());
  await page.goto(site.base + '/uzsakymas', { waitUntil: 'networkidle' });
  const next = page.getByRole('button', { name: 'Toliau: vardas' });
  assert.equal(await next.isDisabled(), true, 'cannot continue without a photo');

  await page.locator('input[type=file]').first().setInputFiles(fx('maza.jpg'));
  await page.getByText('Ši nuotrauka netinka.').waitFor();
  assert.match(await page.locator('.alert').first().innerText(), /Per maža raiška: 480×600 px/);
  assert.equal(await next.isDisabled(), true);

  await page.locator('input[type=file]').first().setInputFiles(fx('ne-paveikslelis.jpg'));
  await page.getByText('Šio failo formato nepriimame').waitFor();

  await page.locator('input[type=file]').first().setInputFiles(fx('sunelis.heic'));
  await page.getByText('Nuotrauka tinka.').waitFor({ timeout: 30000 });
  assert.match(await page.locator('.upload-done img').getAttribute('src'), /^data:image\/jpeg/);
  await next.click();

  // Name step.
  const toStyle = page.getByRole('button', { name: 'Toliau: gaminys ir stilius' });
  await page.getByLabel('Augintinio vardas').fill('Reksas 🐶');
  await page.getByText('Jaustukų atspausdinti negalime').waitFor();
  assert.equal(await toStyle.isDisabled(), true);

  await page.getByLabel('Augintinio vardas').fill(NAME);
  await page.getByLabel('Antra eilutė (nebūtina)').fill('2014 – 2026');
  const poster = page.locator('.poster');
  assert.match(await poster.getAttribute('aria-label'), new RegExp(NAME));
  assert.equal(await poster.locator('.name').innerText(), NAME);
  assert.match(await poster.locator('.art-photo').getAttribute('src'), /^data:image\/jpeg;base64,/, 'the customer sees their own photo in the poster');
  assert.match(await poster.locator('.art-tag').innerText(), /portretą nupiešime/);
  await page.evaluate(() => document.fonts.ready);
  assert.match(await poster.locator('.name').evaluate((el) => getComputedStyle(el).fontFamily), /Cormorant/);
  assert.equal(await page.evaluate(() => document.fonts.check('italic 500 40px Cormorant', 'Žąsiukė Ąžuolė')), true, 'poster typeface is loaded with Lithuanian letters');

  // A 30-character name still fits inside the poster.
  await page.getByLabel('Augintinio vardas').fill('W'.repeat(30));
  await page.waitForTimeout(150);
  const fits = await poster.evaluate((el) => {
    const n = el.querySelector('.name').getBoundingClientRect();
    const p = el.getBoundingClientRect();
    return n.left >= p.left && n.right <= p.right + 0.5;
  });
  assert.equal(fits, true, 'long name stays inside the poster');
  await page.getByLabel('Augintinio vardas').fill(NAME);
  await toStyle.click();

  // Product: a blanket and a phone case have no size or frame; the case needs a phone model.
  assert.equal(await page.locator('input[name=product]').count(), 3);
  await page.getByText('Telefono dėklas', { exact: true }).click();
  await page.getByLabel('Telefono modelis').waitFor();
  assert.equal(await page.locator('input[name=size]').count(), 0);
  assert.equal(await page.locator('input[name=frame]').count(), 0);
  assert.match(await poster.getAttribute('aria-label'), /^Dėklo maketas/);
  const toDelivery = page.getByRole('button', { name: 'Toliau: pristatymas' });
  assert.equal(await toDelivery.isDisabled(), true, 'phone model is required');
  await page.getByLabel('Telefono modelis').selectOption('Samsung Galaxy S24');
  await page.locator('.camera-lens').nth(2).waitFor();
  assert.equal(await page.locator('.camera-module').count(), 0, 'Samsung lenses stand alone, no module');
  await page.getByLabel('Telefono modelis').selectOption('iPhone 15');
  await page.locator('.camera-module').waitFor();
  assert.equal(await page.locator('.camera-lens').count(), 2, 'iPhone 15 has two lenses');
  assert.equal(await toDelivery.isDisabled(), false);
  await page.getByText('Pledas', { exact: true }).click();
  await page.locator('.poster--pledas').waitFor();
  assert.match(await poster.getAttribute('aria-label'), /^Pledo maketas/);
  assert.equal(await page.locator('.frame .poster').count(), 0, 'a blanket has no frame');
  await page.getByText('Paveikslas su rėmeliu', { exact: true }).click();
  await page.locator('input[name=size]').first().waitFor({ state: 'attached' });

  // Style, size, frame: at most two sizes.
  assert.equal(await page.locator('input[name=size]').count(), 2);
  assert.equal(await page.locator('input[name=style]').count(), 3);
  await page.getByText('Aliejus', { exact: true }).click();
  assert.equal(await poster.locator('.name').innerText(), 'ŽĄSIUKĖ ĄŽUOLĖ', 'this style prints the name in capitals');
  assert.match(await poster.locator('.name').evaluate((el) => getComputedStyle(el).fontFamily), /Playfair/);
  await page.getByText('Akvarelė', { exact: true }).click();
  await page.getByText('Juodas', { exact: true }).click();
  await page.getByRole('button', { name: 'Toliau: pristatymas' }).click();

  // Delivery and payment: server-side validation messages appear at the field.
  const pay = page.getByRole('button', { name: /Apmokėti 45 €/ });
  await pay.click();
  await page.getByText('Įrašykite savo vardą ir pavardę.').waitFor();
  await page.getByLabel('Vardas ir pavardė').fill('Ona Petraitė');
  await page.getByLabel('El. paštas').fill('ne-pastas');
  await pay.click();
  await page.getByText('El. pašto adresas neteisingas.').waitFor();
  await page.getByLabel('Miestas').fill('Vilnius');
  await page.getByLabel('Paštomato adresas arba pavadinimas').fill('Ozo g. 25, Akropolis');
  await page.getByLabel('Vardas ir pavardė').fill('Ona Petraitė');
  await page.getByLabel('El. paštas').fill('ona@example.test');
  await page.getByLabel('Telefonas').fill('+370 600 00000');
  await pay.click();
  await page.getByText('Pažymėkite, kad sutinkate su pirkimo taisyklėmis.').waitFor();
  assert.equal(site.db().orders.length, 0, 'nothing is created before the form is valid');
  assert.match(await page.locator('.summary').innerText(), new RegExp(NAME));

  await page.locator('label.check input').check();
  await pay.click();

  // Stand-in payment page. Cancelling keeps everything, and paying again reuses the order.
  await page.waitForURL(/\/bandymas\/mokejimas\//);
  assert.equal(site.db().orders.length, 1);
  assert.equal(site.db().orders[0].status, 'laukia_apmokejimo');
  assert.equal(site.outbox().length, 0, 'no email before payment');
  await page.getByRole('link', { name: 'Atšaukti' }).click();
  await page.getByText('Mokėjimas neįvyko, užsakymas neapmokėtas.').waitFor();
  await page.locator('label.check input').check();
  await page.getByRole('button', { name: /Apmokėti 45 €/ }).click();
  await page.waitForURL(/\/bandymas\/mokejimas\//);
  assert.equal(site.db().orders.length, 1, 'a cancelled payment does not create a second order');
  await page.getByRole('button', { name: 'Apmokėti (bandomasis)' }).click();

  await page.waitForURL(/\/uzsakymas\/aciu/);
  assert.equal(await page.locator('h1').innerText(), 'Ačiū, užsakymą gavome');
  order = site.db().orders[0];
  assert.equal(order.status, 'apmoketa');
  assert.equal(order.name, NAME);
  assert.equal(order.priceCents, 4500);
  assert.equal(order.frame, 'juodas');
  assert.match(await page.locator('main').innerText(), new RegExp(order.code));
  assert.match(await page.locator('main').innerText(), new RegExp(NAME));
  await page.close();
});

test('after payment: the order is saved, the customer and the owner each get one email', async () => {
  assert.equal(mails('orderReceived').length, 1);
  assert.equal(mails('ownerNewOrder').length, 1);
  const mail = mails('orderReceived')[0];
  assert.equal(mail.to, 'ona@example.test');
  for (const part of [mail.subject, mail.html, mail.text]) assert.ok(part.includes(NAME), 'name with Lithuanian letters in the email');
  assert.ok(mail.html.includes(order.code));
  assert.equal(mails('ownerNewOrder')[0].to, 'savininkas@example.test');
});

test('payment webhook over HTTP: a repeated notification changes nothing, a forged one is rejected', async () => {
  process.env.ALLOW_TEST_HOOKS = '1';
  process.env.DATA_DIR = site.dataDir;
  for (const k of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) delete process.env[k];
  const { buildFakeWebhook } = await import('../server/payments.js');
  const { payload, header } = buildFakeWebhook(order);
  const post = (body, sig) => fetch(site.base + '/api/mokejimas/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': sig }, body });

  const before = { orders: site.db().orders.length, mails: site.outbox().length };
  for (let i = 0; i < 3; i++) {
    const res = await post(payload, header);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).result, 'already_paid');
  }
  assert.deepEqual({ orders: site.db().orders.length, mails: site.outbox().length }, before);

  assert.equal((await post(payload, 't=1,v1=00')).status, 400);
  assert.equal((await post(payload.replace(order.id, '00000000-0000-4000-8000-000000000000'), header)).status, 400, 'altered body fails the signature check');
  assert.equal((await post('{}', '')).status, 400);
});

test('customer photo and order files are private', async () => {
  refreshOrder();
  const anon = await browser.newContext();
  const get = (url) => anon.request.get(site.base + url, { maxRedirects: 0 });
  assert.equal((await get(`/api/valdymas/failas/${order.id}/photo`)).status(), 401);
  assert.equal((await get(`/api/valdymas/failas/${order.id}/print`)).status(), 401);
  assert.equal((await anon.request.post(site.base + '/api/valdymas/ikelimas')).status(), 401);
  assert.equal((await get(`/${order.photoKey}`)).status(), 404, 'storage keys are not URLs');
  assert.equal((await get(`/api/perziura/${'x'.repeat(32)}/vaizdas`)).status(), 404);
  assert.equal((await get('/valdymas')).status(), 307);
  assert.equal((await get(`/valdymas/${order.id}`)).status(), 307);
  await anon.close();
});

test('admin: login, order list, download the photo, upload the portrait, send the preview', async () => {
  const page = watch(await admin.newPage());
  await page.goto(site.base + '/valdymas');
  await page.waitForURL(/\/valdymas\/prisijungti/);
  await page.getByLabel('Slaptažodis').fill('neteisingas');
  await page.getByRole('button', { name: 'Prisijungti' }).click();
  await page.getByText('Slaptažodis neteisingas.').waitFor();
  await page.getByLabel('Slaptažodis').fill(PASSWORD);
  await page.getByRole('button', { name: 'Prisijungti' }).click();
  await page.waitForURL(/\/valdymas$/);

  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'admin list fits a phone screen');
  await page.getByText('Dar nesutvarkyta prieš paleidimą').waitFor();
  const row = page.locator('.order-list a', { hasText: NAME });
  assert.match(await row.innerText(), /Apmokėta/);
  await row.click();
  await page.waitForURL(new RegExp(order.id));
  assert.equal(await page.locator('h1').innerText(), NAME);

  const photo = await admin.request.get(`${site.base}/api/valdymas/failas/${order.id}/photo`);
  assert.equal(photo.status(), 200);
  assert.equal(photo.headers()['content-type'], 'image/jpeg');
  assert.match(photo.headers()['content-disposition'], /attachment/);
  assert.equal((await admin.request.get(`${site.base}/api/valdymas/failas/${order.id}/print`)).status(), 404, 'no print file before approval');

  await page.locator('input[type=file]').setInputFiles(fx('portretas.png'));
  await page.getByRole('button', { name: 'Siųsti peržiūrą klientui' }).waitFor({ timeout: 60000 });
  assert.equal(await page.locator('.preview-img').evaluate((img) => img.complete && img.naturalWidth), 1200);
  assert.equal((await admin.request.get(`${site.base}/api/valdymas/failas/${order.id}/print`)).status(), 404, 'still locked: the customer has not approved');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, 'admin order page fits a phone screen');

  await page.getByRole('button', { name: 'Siųsti peržiūrą klientui' }).click();
  await page.getByText('Peržiūra išsiųsta klientui.').waitFor();
  assert.equal(refreshOrder().status, 'laukia_patvirtinimo');
  assert.equal(mails('previewReady').length, 1);
  await page.close();
});

test('customer: opens the link from the email, asks for one fix; a second fix is not offered', async () => {
  const link = mails('previewReady')[0].html.match(/href="([^"]+\/perziura\/[^"]+)"/)[1];
  assert.equal(link, `${site.base}/perziura/${order.token}`);
  const page = watch(await customer.newPage());
  await page.goto(link);
  assert.match(await page.locator('h1').innerText(), new RegExp(NAME));
  await page.waitForFunction(() => document.querySelector('.preview-img')?.complete);
  assert.equal(await page.locator('.preview-img').evaluate((img) => img.naturalWidth), 1200, 'watermarked preview is shown');

  await page.getByRole('button', { name: 'Noriu pataisymo' }).click();
  await page.getByLabel('Ką pataisyti?').fill('Kairė ausis turi būti nulinkusi, o akys gintarinės.');
  await page.getByRole('button', { name: 'Išsiųsti pataisymo prašymą' }).click();
  await page.getByRole('heading', { name: 'Taisome portretą' }).waitFor();
  assert.equal(refreshOrder().status, 'taisoma');
  assert.equal(mails('revisionReceived').length, 1);
  assert.equal(mails('ownerRevision').length, 1);
  assert.match(mails('ownerRevision')[0].html, /gintarinės/);
  await page.close();
});

test('admin sends the fixed portrait; customer approves; only then the print file is released', async () => {
  const adminPage = watch(await admin.newPage());
  await adminPage.goto(`${site.base}/valdymas/${order.id}`);
  assert.match(await adminPage.locator('.panel').innerText(), /Klientas prašo pataisyti:.*gintarinės/s);
  await adminPage.locator('input[type=file]').setInputFiles(fx('portretas.png'));
  await adminPage.getByRole('button', { name: 'Siųsti peržiūrą klientui' }).waitFor({ timeout: 60000 });
  await adminPage.getByRole('button', { name: 'Siųsti peržiūrą klientui' }).click();
  await adminPage.getByText('Peržiūra išsiųsta klientui.').waitFor();
  assert.equal(mails('previewReady').length, 2);
  assert.equal(refreshOrder().portraitVersion, 2);

  const page = watch(await customer.newPage());
  await page.goto(`${site.base}/perziura/${order.token}`);
  assert.equal(await page.getByRole('button', { name: 'Noriu pataisymo' }).count(), 0, 'the free revision is used up');
  await page.getByText('Nemokamas pataisymas jau panaudotas.').waitFor();
  await page.getByRole('button', { name: 'Tinka, spausdinkite' }).click();
  await page.getByRole('heading', { name: 'Portretas patvirtintas' }).waitFor();
  assert.equal(refreshOrder().status, 'patvirtinta');
  assert.equal(order.approvedVersion, 2);
  assert.equal(mails('approved').length, 1);
  assert.equal(mails('ownerApproved').length, 1);
  await page.close();

  // The released print file passes the scripted measurement.
  const res = await admin.request.get(`${site.base}/api/valdymas/failas/${order.id}/print`);
  assert.equal(res.status(), 200);
  assert.equal(res.headers()['content-type'], 'application/pdf');
  const { inspectPrintPdf } = await import('../src/pdf.js');
  const { getSize } = await import('../src/config.js');
  const inspection = await inspectPrintPdf(await res.body(), getSize('30x40'));
  assert.equal(inspection.ok, true, JSON.stringify(inspection.checks.filter((c) => !c.ok)));

  // Print → shipped, each with its email.
  await adminPage.reload();
  await adminPage.getByRole('button', { name: 'Atidaviau spaustuvei' }).click();
  await adminPage.getByText('Pažymėta: spaudoje.').waitFor();
  assert.equal(mails('inPrint').length, 1);
  await adminPage.getByRole('button', { name: 'Išsiųsta: pranešti klientui' }).click(); // empty tracking number
  assert.equal(refreshOrder().status, 'spaudoje', 'cannot ship without a tracking number');
  await adminPage.getByLabel('Siuntos numeris').fill('CC123456789LT');
  await adminPage.getByRole('button', { name: 'Išsiųsta: pranešti klientui' }).click();
  await adminPage.getByText('Pažymėta: išsiųsta.').waitFor();
  assert.equal(refreshOrder().status, 'issiusta');
  const shipped = mails('shipped');
  assert.equal(shipped.length, 1);
  assert.ok(shipped[0].html.includes('CC123456789LT') && shipped[0].html.includes(NAME));
  await adminPage.close();

  const after = watch(await customer.newPage());
  await after.goto(`${site.base}/perziura/${order.token}`);
  assert.match(await after.locator('main').innerText(), /CC123456789LT/);
  await after.close();
});

test('admin self-check page exercises the services and can send a test email', async () => {
  const page = watch(await admin.newPage());
  await page.goto(`${site.base}/valdymas/patikra`);
  const text = await page.locator('main').innerText();
  // On the local stand-ins the page must say so plainly, not report success.
  assert.match(text, /Ne viskas veikia\. Tikrų užsakymų dar nepriimkite\./);
  assert.match(text, /Naudojama laikina vietinė bazė, ne Supabase\./);
  assert.match(text, /Įkėlimas per pasirašytą nuorodą veikia\./);
  assert.match(text, /Naudojamas bandomasis mokėjimas/);
  await page.getByRole('button', { name: 'Išsiųsti bandomąjį laišką man' }).click();
  await page.getByText('Bandomasis laiškas išsiųstas adresu savininkas@example.test').waitFor();
  assert.equal(site.outbox().filter((m) => m.kind === 'selfcheck').length, 1);
  await page.close();
});

test('no JavaScript errors anywhere on the path', () => {
  assert.deepEqual(consoleErrors, []);
});

test('after the Christmas deadline the site switches by itself and offers a printable voucher', async () => {
  const late = await startSite({ TEST_NOW: '2026-12-14T10:00:00Z' });
  try {
    const ctx = await browser.newContext(PHONE);
    const page = await ctx.newPage();
    await page.goto(late.base + '/');
    assert.match(await page.locator('.notice').innerText(), /Iki Kalėdų nebespėjame/);
    assert.match(await page.locator('.notice').innerText(), /dovanų kuponą \(PDF\)/);
    assert.match(await page.locator('.under-cta').innerText(), /po Kalėdų/);

    // Place an order through the same HTTP endpoints the browser uses.
    const slot = await (await fetch(late.base + '/api/ikelimas', { method: 'POST' })).json();
    const uploadUrl = new URL(slot.upload.url, late.base).href;
    assert.equal((await fetch(uploadUrl, { method: 'PUT', body: fs.readFileSync(fx('sunelis.jpg')) })).status, 200);
    const confirmed = await (await fetch(late.base + '/api/ikelimas/patvirtinti', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photoId: slot.photoId }) })).json();
    assert.equal(confirmed.ok, true);
    const created = await fetch(late.base + '/api/uzsakymas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        photoId: slot.photoId, name: NAME, secondLine: '', style: 'grafika', size: 'a4', frame: 'baltas', customerName: 'Jonas Jonaitis',
        email: 'jonas@example.test', phone: '860000000', deliveryNetwork: 'Omniva', deliveryCity: 'Kaunas', deliveryAddress: 'Mega', acceptTerms: true,
      }),
    });
    assert.equal(created.status, 200);
    const { checkoutUrl, token } = await created.json();
    await page.goto(new URL(checkoutUrl, late.base).href);
    await page.getByRole('button', { name: 'Apmokėti (bandomasis)' }).click();
    await page.waitForURL(/\/uzsakymas\/aciu/);
    await page.getByRole('heading', { name: 'Dovanų kuponas' }).waitFor();
    assert.equal(late.db().orders[0].afterChristmas, true);

    assert.equal((await fetch(`${late.base}/kuponas/${'x'.repeat(32)}`)).status, 404);
    const pdf = await fetch(`${late.base}/kuponas/${token}`);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
    const mail = late.outbox().find((m) => m.kind === 'orderReceived');
    assert.match(mail.html, /Pristatymas po Kalėdų/);
    assert.ok(mail.html.includes(`/kuponas/${token}`));

    // Wrong upload signature is refused.
    assert.equal((await fetch(uploadUrl.replace(/sig=[^&]+/, 'sig=abc'), { method: 'PUT', body: 'x' })).status, 403);
    await ctx.close();
  } finally {
    await late.stop();
  }
});

test('older iPad (Safari 15, no container units): the live preview keeps its layout', async () => {
  // Chromium has container units; make the poster's children use the px unit
  // the component measures, which is what Safari 15 falls back to.
  const ctx = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true });
  const page = watch(await ctx.newPage());
  const measure = async () =>
    page.evaluate(() => {
      const po = document.querySelector('.poster').getBoundingClientRect();
      const n = document.querySelector('.poster .name').getBoundingClientRect();
      const a = document.querySelector('.poster .art').getBoundingClientRect();
      return { inside: n.left >= po.left && n.right <= po.right + 0.5, name: [Math.round(n.left - po.left), Math.round(n.top - po.top)], art: [Math.round(a.top - po.top), Math.round(a.height)] };
    });
  await page.goto(site.base + '/uzsakymas');
  await page.evaluate(() => sessionStorage.clear());
  await page.locator('input[type=file]').first().setInputFiles(fx('sunelis.jpg'));
  await page.getByText('Nuotrauka tinka.').waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Toliau: vardas' }).click();
  await page.getByLabel('Augintinio vardas').fill('Žąsiukė Ąžuolė');
  await page.evaluate(() => document.fonts.ready);
  const modern = await measure();
  await page.addStyleTag({ content: '.poster *, .poster > * { --u: inherit !important; }' });
  await page.waitForTimeout(100);
  const fallback = await measure();
  assert.deepEqual(fallback, modern);
  assert.equal(fallback.inside, true);
  await ctx.close();
});

test('a server error shows a Lithuanian page with a code, not the default English one', async () => {
  const page = await browser.newPage();
  await page.goto(site.base + '/bandymas/klaida');
  await page.getByRole('heading', { name: 'Kažkas nepavyko' }).waitFor();
  assert.match(await page.locator('main').innerText(), /nurodykite šį kodą: \w+/);
  assert.doesNotMatch(await page.locator('body').innerText(), /Application error|server-side exception/i);
  await page.close();
});
