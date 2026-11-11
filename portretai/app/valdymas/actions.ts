'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireAdmin, isAdmin } from './_auth';
import { SESSION_COOKIE, checkAdminPassword, createSession } from '@/server/crypto.js';
import { siteUrl } from '@/server/settings.js';
import { storage } from '@/server/storage.js';
import { UserError, startWork, setPortrait, sendPreview, remindPreview, markPrinting, markShipped, cancelOrder } from '@/server/orders.js';

export async function loginAction(formData: FormData) {
  // A fixed delay makes guessing slow without any shared state.
  await new Promise((r) => setTimeout(r, 700));
  if (!checkAdminPassword(String(formData.get('password') || ''))) redirect('/valdymas/prisijungti?klaida=1');
  const session = createSession();
  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: siteUrl().startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  });
  redirect('/valdymas');
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/valdymas/prisijungti');
}

/** Runs one admin step and returns to the order page with the outcome. */
async function step(id: string, ok: string, fn: () => Promise<unknown>): Promise<never> {
  await requireAdmin();
  let query = `ok=${encodeURIComponent(ok)}`;
  try {
    await fn();
  } catch (err) {
    if (err instanceof UserError) query = `klaida=${encodeURIComponent(err.message)}`;
    else {
      console.error('[valdymas]', err);
      query = `klaida=${encodeURIComponent('Įvyko klaida. Bandykite dar kartą. Jei kartojasi, žiūrėkite README skyrių „Jei kas nors sugenda“.')}`;
    }
  }
  redirect(`/valdymas/${id}?${query}`);
}

const idOf = (formData: FormData) => String(formData.get('id') || '');

export async function startWorkAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Pažymėta: kuriama.', () => startWork(id));
}

export async function sendPreviewAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Peržiūra išsiųsta klientui.', () => sendPreview(id));
}

export async function remindAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Priminimas išsiųstas.', () => remindPreview(id));
}

export async function markPrintingAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Pažymėta: spaudoje. Klientui išsiųstas laiškas.', () => markPrinting(id));
}

export async function markShippedAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Pažymėta: išsiųsta. Klientui išsiųstas laiškas su siuntos numeriu.', () => markShipped(id, String(formData.get('tracking') || '')));
}

export async function cancelAction(formData: FormData) {
  const id = idOf(formData);
  await step(id, 'Užsakymas atšauktas.', async () => {
    if (formData.get('confirm') !== 'on') throw new UserError('Pažymėkite varnelę, kad tikrai norite atšaukti.');
    await cancelOrder(id);
  });
}

/**
 * Called by the upload widget after the portrait file has reached storage.
 * Lays out the poster and stores the preview, mockup and print file.
 */
export async function portraitUploadedAction(id: string, key: string): Promise<{ error: string | null }> {
  if (!(await isAdmin())) return { error: 'Sesija baigėsi. Prisijunkite iš naujo.' };
  if (typeof key !== 'string' || !/^uploads\/admin-[0-9a-f-]{36}$/.test(key)) return { error: 'Neteisingas failas.' };
  const s = await storage();
  try {
    const buffer = await s.get(key);
    if (!buffer) return { error: 'Failas nepasiekė serverio. Bandykite dar kartą.' };
    await setPortrait(id, buffer);
    return { error: null };
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error('[valdymas/portretas]', err);
    return { error: 'Nepavyko sugeneruoti plakato. Bandykite dar kartą.' };
  } finally {
    await s.remove([key]).catch(() => {});
  }
}
