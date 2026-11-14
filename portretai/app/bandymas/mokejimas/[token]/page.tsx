import { notFound, redirect } from 'next/navigation';
import { driverFor } from '@/server/env.js';
import { getOrderByToken } from '@/server/orders.js';
import { buildFakeWebhook } from '@/server/payments.js';
import { formatPrice, siteUrl } from '@/server/settings.js';

// Stand-in payment page for development and automated tests. It exists only
// when payments run on the local stand-in; with Stripe configured it is a 404.

export default async function FakePaymentPage({ params }: { params: Promise<{ token: string }> }) {
  if (driverFor('payment') !== 'fake') notFound();
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();

  async function pay() {
    'use server';
    if (driverFor('payment') !== 'fake') notFound();
    const current = await getOrderByToken(token);
    if (!current) notFound();
    const { payload, header } = buildFakeWebhook(current);
    // Goes through the real webhook endpoint, signature check included.
    const res = await fetch(`${siteUrl()}/api/mokejimas/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': header },
      body: payload,
    });
    if (!res.ok) throw new Error(`Webhook answered ${res.status}`);
    redirect(`/uzsakymas/aciu?t=${token}`);
  }

  return (
    <div className="wrap flow">
      <div className="alert warn">
        <p>
          <strong>Bandomasis mokėjimas.</strong> Šis puslapis veikia tik bandymų aplinkoje. Tikri pinigai nenuskaitomi.
        </p>
      </div>
      <h1>Mokėti {formatPrice(order.priceCents)}</h1>
      <p>
        Užsakymas {order.code}: „{order.name}“
      </p>
      <form action={pay}>
        <button type="submit" className="btn accent">
          Apmokėti (bandomasis)
        </button>
      </form>
      <p style={{ marginTop: 10 }}>
        <a className="btn ghost" href="/uzsakymas?atsaukta=1">
          Atšaukti
        </a>
      </p>
    </div>
  );
}
