// Turns errors into HTTP responses. A UserError's message is written for the
// person and is returned as is; anything else is logged and hidden.

import { UserError } from './orders.js';

export function errorResponse(err, where) {
  if (err instanceof UserError) {
    return Response.json({ error: err.message, field: err.field ?? null }, { status: 400 });
  }
  console.error(`[${where}]`, err);
  return Response.json({ error: 'Įvyko klaida. Bandykite dar kartą po minutės.' }, { status: 500 });
}

export async function readJson(request, maxBytes = 20_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new UserError('Per daug duomenų.');
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('not an object');
    return data;
  } catch {
    throw new UserError('Neteisinga užklausa.');
  }
}
