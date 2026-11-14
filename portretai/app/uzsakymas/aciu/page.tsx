import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AutoRefresh from '@/components/AutoRefresh';
import ClearDraft from '@/components/ClearDraft';
import { getOrderByToken } from '@/server/orders.js';
import { SETTINGS, STYLE_LABELS, describeProduct, formatPrice, contactEmail } from '@/server/settings.js';
import { formatDateLong } from '@/server/deadline.js';

export const metadata: Metadata = { title: 'Užsakymas', robots: { index: false } };

export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const order = await getOrderByToken(t);
  if (!order) notFound();
  const contact = contactEmail();

  if (order.status === 'laukia_apmokejimo') {
    return (
      <div className="wrap flow">
        <h1>Laukiame mokėjimo patvirtinimo</h1>
        <p role="status">Bankas dar nepatvirtino mokėjimo. Paprastai tai trunka kelias sekundes; puslapis atsinaujins pats.</p>
        <p className="muted">
          Jei mokėjimą atšaukėte, galite <Link href="/uzsakymas?atsaukta=1">grįžti ir mokėti dar kartą</Link>. Jūsų nuotrauka ir duomenys išsaugoti.
        </p>
        <AutoRefresh />
      </div>
    );
  }

  if (order.status === 'atsaukta') {
    return (
      <div className="wrap flow">
        <h1>Užsakymas atšauktas</h1>
        <p>Užsakymas {order.code} atšauktas.{contact ? ` Jei manote, kad tai klaida, parašykite ${contact}.` : ''}</p>
      </div>
    );
  }

  return (
    <div className="wrap flow">
      <ClearDraft />
      <p className="label">Užsakymas {order.code}</p>
      <h1>Ačiū, užsakymą gavome</h1>
      <p>
        Apmokėjimas gautas. Patvirtinimą išsiuntėme adresu <strong>{order.email}</strong>. Jei laiško nėra per 10 minučių, patikrinkite šlamšto aplanką.
      </p>

      <h2 style={{ fontSize: 26, margin: '24px 0 8px' }}>Kas toliau</h2>
      <ol className="steps">
        <li>
          <div>
            <h3>Per {SETTINGS.production.creationDays} darbo d. atsiųsime peržiūrą</h3>
            <p>El. paštu gausite nuorodą. Paspausite „Tinka“ arba parašysite, ką pataisyti.</p>
          </div>
        </li>
        <li>
          <div>
            <h3>{(order.product || 'plakatas') === 'plakatas' ? 'Patvirtinus spausdiname ir įrėminame' : 'Patvirtinus atiduodame spaudai'}</h3>
            <p>Be jūsų patvirtinimo į spaudą neatiduodame.</p>
          </div>
        </li>
        <li>
          <div>
            <h3>Pristatome apie {formatDateLong(order.estimatedDelivery)}</h3>
            <p>
              Į {order.deliveryNetwork} paštomatą: {order.deliveryCity}, {order.deliveryAddress}.
            </p>
          </div>
        </li>
      </ol>

      {order.afterChristmas ? (
        <div className="notice" style={{ marginTop: 24 }}>
          <h2>Dovanų kuponas</h2>
          <p>Portretas atkeliaus po Kalėdų. Atsispausdinkite kuponą su vardu „{order.name}“ ir padėkite po eglute.</p>
          <a className="btn" href={`/kuponas/${order.token}`} target="_blank" rel="noopener">
            Atsisiųsti dovanų kuponą (PDF)
          </a>
        </div>
      ) : null}

      <dl className="summary" style={{ marginTop: 28 }}>
        <div>
          <dt>Vardas</dt>
          <dd>{order.name}</dd>
        </div>
        {order.secondLine ? (
          <div>
            <dt>Antra eilutė</dt>
            <dd>{order.secondLine}</dd>
          </div>
        ) : null}
        <div>
          <dt>Stilius</dt>
          <dd>{STYLE_LABELS[order.style as keyof typeof STYLE_LABELS]}</dd>
        </div>
        <div>
          <dt>Gaminys</dt>
          <dd>{describeProduct(order)}</dd>
        </div>
        <div className="total">
          <dt>Sumokėta</dt>
          <dd>{formatPrice(order.priceCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
