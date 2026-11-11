// Payments.
//   stripe – production: Stripe Checkout (hosted payment page)
//   fake   – development and tests: a local "pay" page that sends the same
//            signed webhook Stripe would send
//
// Both drivers deliver payment confirmation through the same webhook and the
// same signature check, so the tested code path is the production one.

import Stripe from 'stripe';
import { driverFor } from './env.js';
import { siteUrl, STYLE_LABELS, SIZE_LABELS } from './settings.js';

const LOCAL_WEBHOOK_SECRET = 'whsec_local_development_only';

function webhookSecret() {
  if (driverFor('payment') === 'stripe') return process.env.STRIPE_WEBHOOK_SECRET;
  return process.env.STRIPE_WEBHOOK_SECRET || LOCAL_WEBHOOK_SECRET;
}

let client;
function stripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_unused_for_local_webhooks');
  return client;
}

/**
 * @returns {Promise<{ url: string, ref: string }>} where to send the customer, and the provider's reference
 */
export async function createCheckout(order) {
  const success = `${siteUrl()}/uzsakymas/aciu?t=${order.token}`;
  const cancel = `${siteUrl()}/uzsakymas?atsaukta=1`;

  if (driverFor('payment') === 'fake') {
    return { url: `${siteUrl()}/bandymas/mokejimas/${order.token}`, ref: `fake_${order.id}` };
  }

  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'lt',
    customer_email: order.email,
    client_reference_id: order.id,
    metadata: { orderId: order.id },
    payment_intent_data: { metadata: { orderId: order.id }, description: `Užsakymas ${order.code}` },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: order.priceCents,
          product_data: {
            name: `Augintinio portretas „${order.name}“`,
            description: `${STYLE_LABELS[order.style]}, ${SIZE_LABELS[order.size]}, su rėmeliu. Užsakymas ${order.code}.`,
          },
        },
      },
    ],
    success_url: success,
    cancel_url: cancel,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return { url: session.url, ref: session.id };
}

/**
 * Verifies the signature and extracts what the order logic needs.
 * Throws when the signature is wrong.
 * @returns {{ eventId: string, type: string, orderId: string|null, paid: boolean, ref: string|null, amountCents: number|null }}
 */
export function parseWebhook(rawBody, signatureHeader) {
  const event = stripe().webhooks.constructEvent(rawBody, signatureHeader, webhookSecret());
  const obj = event.data?.object ?? {};
  const isCheckout = event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded';
  return {
    eventId: event.id,
    type: event.type,
    orderId: obj.metadata?.orderId ?? obj.client_reference_id ?? null,
    paid: isCheckout && obj.payment_status === 'paid',
    ref: obj.id ?? null,
    amountCents: typeof obj.amount_total === 'number' ? obj.amount_total : null,
  };
}

/**
 * Builds the webhook request the fake payment page (and tests) send.
 * Not available with the stripe driver.
 */
export function buildFakeWebhook(order, { eventId, type = 'checkout.session.completed', paymentStatus = 'paid' } = {}) {
  if (driverFor('payment') !== 'fake') throw new Error('Fake payments are disabled.');
  const payload = JSON.stringify({
    id: eventId || `evt_fake_${order.id}`,
    object: 'event',
    type,
    data: {
      object: {
        id: `fake_${order.id}`,
        object: 'checkout.session',
        client_reference_id: order.id,
        metadata: { orderId: order.id },
        payment_status: paymentStatus,
        amount_total: order.priceCents,
        currency: 'eur',
      },
    },
  });
  const header = stripe().webhooks.generateTestHeaderString({ payload, secret: webhookSecret() });
  return { payload, header };
}
