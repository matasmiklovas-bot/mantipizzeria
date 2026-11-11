import { parseWebhook } from '@/server/payments.js';
import { handlePaymentEvent } from '@/server/orders.js';

export const maxDuration = 30;

// Payment notifications. The provider retries until it gets a 2xx answer, so:
//   bad signature        -> 400 (never retried into success)
//   handled / not for us -> 200
//   our own failure      -> 500 (the provider tries again; handling is idempotent)
export async function POST(request: Request) {
  const raw = await request.text();
  let event;
  try {
    event = parseWebhook(raw, request.headers.get('stripe-signature') || '');
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
  try {
    const { result } = await handlePaymentEvent(event);
    return Response.json({ received: true, result });
  } catch (err) {
    console.error('[webhook]', err);
    return Response.json({ error: 'Temporary failure' }, { status: 500 });
  }
}
