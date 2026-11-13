import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PreviewActions from '@/components/PreviewActions';
import { getOrderByToken, revisionsLeft } from '@/server/orders.js';
import { STATUS_LABELS, STYLE_LABELS, describeProduct, contactEmail } from '@/server/settings.js';
import { previewHeight } from '@/src/config.js';
import { formatDateTime } from '@/server/deadline.js';

export const metadata: Metadata = { title: 'Portreto peržiūra', robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order || !order.paidAt) notFound();
  const contact = contactEmail();
  const img = `/api/perziura/${order.token}/vaizdas?v=${order.portraitVersion}`;
  const approved = ['patvirtinta', 'spaudoje', 'issiusta'].includes(order.status);

  return (
    <div className="wrap flow">
      <p className="label">Užsakymas {order.code}</p>

      {order.status === 'laukia_patvirtinimo' ? (
        <>
          <h1>„{order.name}“ portreto peržiūra</h1>
          <p>Patikrinkite, ar tai jūsų augintinis ir ar vardas parašytas be klaidų. Vandens ženklo atspaude nebus.</p>
          {order.frame ? (
            <div className={`frame frame--${order.frame} preview-frame`}>
              <div className="glass">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="preview-img" src={img} alt={`„${order.name}“ portreto peržiūra su vandens ženklu`} width={1200} height={previewHeight(order.size, 1200)} />
              </div>
            </div>
          ) : (
            <div className={`preview-product preview-product--${order.product}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="preview-img" src={img} alt={`„${order.name}“ portreto peržiūra su vandens ženklu`} width={1200} height={previewHeight(order.size, 1200)} />
              {order.product === 'deklas' ? (
                <span className="camera" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : null}
            </div>
          )}
          {order.product === 'deklas' ? <p className="small muted" style={{ textAlign: 'center' }}>Kampe pažymėta, kur bus telefono kamera: ten spaudos nesimatys.</p> : null}
          <p className="small muted" style={{ textAlign: 'center' }}>
            {STYLE_LABELS[order.style as keyof typeof STYLE_LABELS]} · {describeProduct(order)}
          </p>
          <PreviewActions token={order.token} version={order.portraitVersion} revisionsLeft={revisionsLeft(order)} name={order.name} contact={contact} />
        </>
      ) : null}

      {order.status === 'taisoma' ? (
        <>
          <h1>Taisome portretą</h1>
          <div className="alert ok" role="status">
            <p>Pataisymo prašymą gavome. Naują peržiūrą atsiųsime el. paštu {order.email}.</p>
          </div>
          <p className="muted">Jūsų pastaba: „{order.revisionNotes?.at(-1)?.text}“</p>
        </>
      ) : null}

      {order.status === 'apmoketa' || order.status === 'kuriama' ? (
        <>
          <h1>Portretas dar kuriamas</h1>
          <p>Kai peržiūra bus paruošta, atsiųsime laišką adresu {order.email}.</p>
        </>
      ) : null}

      {approved ? (
        <>
          <h1>Portretas patvirtintas</h1>
          <div className="alert ok" role="status">
            <p>
              Patvirtinote {formatDateTime(order.approvedAt)}. Būsena: <strong>{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS].toLowerCase()}</strong>.
            </p>
          </div>
          {order.status === 'issiusta' ? (
            <p>
              Išsiųsta į {order.deliveryNetwork} paštomatą ({order.deliveryCity}, {order.deliveryAddress}). Siuntos numeris: <strong>{order.trackingNumber}</strong>
            </p>
          ) : (
            <p>Kai išsiųsime, gausite laišką su siuntos numeriu.</p>
          )}
          {order.previewKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="preview-img" src={img} alt={`„${order.name}“ portreto peržiūra`} width={1200} height={order.size === 'a4' ? 1697 : 1600} />
          ) : null}
        </>
      ) : null}

      {order.status === 'atsaukta' ? (
        <>
          <h1>Užsakymas atšauktas</h1>
          <p>{contact ? `Klausimai: ${contact}.` : 'Jei turite klausimų, atsakykite į mūsų laišką.'}</p>
        </>
      ) : null}
    </div>
  );
}
