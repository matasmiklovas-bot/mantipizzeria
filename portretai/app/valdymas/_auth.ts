import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, isValidSession } from '@/server/crypto.js';

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidSession(store.get(SESSION_COOKIE)?.value);
}

/** Call first in every admin page and action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect('/valdymas/prisijungti');
}
