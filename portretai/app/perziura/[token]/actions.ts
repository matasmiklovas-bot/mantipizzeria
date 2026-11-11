'use server';

import { redirect } from 'next/navigation';
import { approvePreview, requestRevision, UserError } from '@/server/orders.js';

export type ActionState = { error: string | null };

export async function approveAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get('token') || '');
  try {
    await approvePreview(token, Number(formData.get('version')));
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error('[approve]', err);
    return { error: 'Nepavyko patvirtinti. Bandykite dar kartą po minutės.' };
  }
  redirect(`/perziura/${token}`);
}

export async function revisionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get('token') || '');
  try {
    await requestRevision(token, String(formData.get('text') || ''));
  } catch (err) {
    if (err instanceof UserError) return { error: err.message };
    console.error('[revision]', err);
    return { error: 'Nepavyko išsiųsti. Bandykite dar kartą po minutės.' };
  }
  redirect(`/perziura/${token}`);
}
