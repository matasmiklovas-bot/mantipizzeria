// Live checks of the services the site depends on, run from the admin page.
// They exercise the same code the order path uses: write and read a row,
// store and fetch a file, upload through a signed URL.

import crypto from 'node:crypto';
import { db } from './db.js';
import { storage } from './storage.js';
import { driverFor } from './env.js';
import { sendEmail, ownerEmail } from './email.js';
import { checkPaymentProvider } from './payments.js';
import { SETTINGS, siteUrl } from './settings.js';

async function attempt(name, fn) {
  try {
    const detail = await fn();
    return typeof detail === 'object' ? { name, ...detail } : { name, ok: true, detail };
  } catch (err) {
    return { name, ok: false, detail: String(err.message || err).slice(0, 300) };
  }
}

export async function runSelfCheck() {
  const results = [];

  results.push(
    await attempt('Duomenų bazė', async () => {
      const d = await db();
      const id = crypto.randomUUID();
      await d.insertPhoto({ id, rawKey: `selfcheck/${id}`, key: null, status: 'pending', orderId: null, createdAt: new Date().toISOString(), width: null, height: null, warnings: [] });
      const updated = await d.casPhoto(id, { status: 'pending' }, { status: 'ready' });
      const refused = await d.casPhoto(id, { status: 'pending' }, { status: 'ready' });
      await d.deletePhoto(id);
      if (!updated || refused) throw new Error('Sąlyginis atnaujinimas veikia neteisingai.');
      if (await d.getPhoto(id)) throw new Error('Įrašas neištrintas.');
      return { ok: d.name === 'supabase', detail: d.name === 'supabase' ? 'Supabase: įrašymas, sąlyginis atnaujinimas ir trynimas veikia.' : 'Naudojama laikina vietinė bazė, ne Supabase.' };
    }),
  );

  results.push(
    await attempt('Failų saugykla', async () => {
      const s = await storage();
      const key = `selfcheck/${crypto.randomUUID()}.txt`;
      const body = Buffer.from(`patikra ${Date.now()}`);
      await s.put(key, body, 'text/plain');
      const back = await s.get(key);
      if (!back || !back.equals(body)) throw new Error('Įrašytas failas neperskaitomas.');
      await s.remove([key]);
      if (await s.get(key)) throw new Error('Failas neištrintas.');
      return { ok: s.name === 'supabase', detail: s.name === 'supabase' ? 'Supabase Storage: įrašymas, skaitymas ir trynimas veikia.' : 'Naudojama laikina vietinė saugykla, ne Supabase.' };
    }),
  );

  results.push(
    await attempt('Nuotraukos įkėlimas iš naršyklės', async () => {
      const s = await storage();
      const key = `uploads/selfcheck-${crypto.randomUUID()}`;
      const upload = await s.createUpload(key);
      const body = Buffer.from('ikelimo patikra');
      const target = upload.url.startsWith('/') ? `${siteUrl()}${upload.url}` : upload.url;
      const res = await fetch(target, { method: upload.method, headers: { 'content-type': 'application/octet-stream', ...upload.headers }, body });
      if (!res.ok) throw new Error(`Pasirašyta įkėlimo nuoroda atmetė failą (HTTP ${res.status}).`);
      const back = await s.get(key);
      await s.remove([key]);
      if (!back || !back.equals(body)) throw new Error('Per pasirašytą nuorodą įkeltas failas nerastas.');
      return 'Įkėlimas per pasirašytą nuorodą veikia.';
    }),
  );

  results.push(await attempt('Mokėjimai', checkPaymentProvider));

  results.push(
    await attempt('El. laiškai', async () => {
      const real = driverFor('email') === 'resend';
      if (!real) return { ok: false, detail: 'Laiškai nesiunčiami (RESEND_API_KEY / EMAIL_FROM nenustatyti).' };
      if (!ownerEmail()) return { ok: false, detail: 'Nenustatytas OWNER_EMAIL: negausite pranešimų apie užsakymus.' };
      return `Siunčiama per Resend iš ${process.env.EMAIL_FROM}. Paspauskite mygtuką žemiau ir patikrinkite, ar laiškas atėjo.`;
    }),
  );

  results.push(
    await attempt('Svetainės adresas', async () => {
      const url = siteUrl();
      if (!url.startsWith('https://')) return { ok: false, detail: `SITE_URL yra ${url}. Turi prasidėti https://, kitaip nuorodos laiškuose neveiks.` };
      return url;
    }),
  );

  return results;
}

export async function sendTestEmail() {
  const to = ownerEmail();
  if (!to) throw new Error('Nenustatytas OWNER_EMAIL.');
  await sendEmail({
    to,
    kind: 'selfcheck',
    subject: `Bandomasis laiškas: ${SETTINGS.brand}`,
    html: `<p>Jei skaitote šį laišką, laiškų siuntimas iš svetainės veikia.</p><p>Žąsiukė Ąžuolė: ą č ę ė į š ų ū ž</p>`,
    text: 'Jei skaitote šį laišką, laiškų siuntimas iš svetainės veikia.\nŽąsiukė Ąžuolė: ą č ę ė į š ų ū ž\n',
  });
  return to;
}
