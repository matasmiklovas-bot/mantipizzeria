import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '../_auth';
import { badgeClass } from '../page';
import { startWorkAction, sendPreviewAction, remindAction, markPrintingAction, markShippedAction, cancelAction } from '../actions';
import PortraitUpload from '@/components/PortraitUpload';
import { db } from '@/server/db.js';
import { isApprovedForPrint } from '@/server/orders.js';
import { STATUS_LABELS, STYLE_LABELS, SIZE_LABELS, FRAME_LABELS, formatPrice, siteUrl } from '@/server/settings.js';
import { formatDateTime, formatDateLong } from '@/server/deadline.js';

export const metadata: Metadata = { title: 'Užsakymas', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
// Laying out a 30×40 cm poster takes several seconds.
export const maxDuration = 120;

const EVENT_LABELS: Record<string, string> = {
  created: 'Užsakymas sukurtas',
  checkout_restarted: 'Mokėjimas pradėtas iš naujo',
  paid: 'Apmokėta',
  payment_amount_mismatch: 'Mokėjimo suma nesutapo',
  payment_after_cancel: 'Mokėjimas už atšauktą užsakymą',
  portrait_uploaded: 'Įkeltas portretas',
  revision_requested: 'Klientas paprašė pataisymo',
  approved: 'Klientas patvirtino',
  email_sent: 'Išsiųstas laiškas',
  email_failed: 'LAIŠKAS NEIŠSIŲSTAS',
  files_purged: 'Failai ištrinti',
  status: 'Būsena',
};

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; klaida?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { ok, klaida } = await searchParams;
  const d = await db();
  const order = await d.getOrder(id);
  if (!order) notFound();
  const events = await d.listOrderEvents(order.id);
  const file = (kind: string) => `/api/valdymas/failas/${order.id}/${kind}`;
  const hasPortrait = order.portraitVersion > 0 && order.previewKey;
  const warnings: string[] = order.renderReport?.warnings ?? [];
  const lastNote = order.revisionNotes?.at(-1);

  return (
    <div className="wrap admin">
      <p className="small">
        <Link href="/valdymas">← Visi užsakymai</Link>
      </p>
      <h1>{order.name}</h1>
      <p>
        <span className={badgeClass(order.status)}>{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}</span>{' '}
        <span className="muted small">
          {order.code}
          {order.afterChristmas ? ' · pristatymas po Kalėdų' : ''}
        </span>
      </p>

      {ok ? (
        <div className="alert ok" role="status">
          <p>{ok}</p>
        </div>
      ) : null}
      {klaida ? (
        <div className="alert" role="alert">
          <p>{klaida}</p>
        </div>
      ) : null}

      <section className="panel" aria-labelledby="next">
        <h2 id="next">Kitas žingsnis</h2>

        {order.status === 'laukia_apmokejimo' ? <p>Klientas dar neapmokėjo. Nieko daryti nereikia.</p> : null}

        {order.status === 'apmoketa' ? (
          <div className="stack">
            <p>Parsisiųskite nuotrauką, sukurkite portretą ir įkelkite jį čia.</p>
            <a className="btn" href={file('photo')}>
              Parsisiųsti kliento nuotrauką
            </a>
            <form action={startWorkAction}>
              <input type="hidden" name="id" value={order.id} />
              <button className="btn ghost" type="submit">
                Pažymėti: pradėjau kurti
              </button>
            </form>
            <PortraitUpload orderId={order.id} label="Įkelti portretą" />
          </div>
        ) : null}

        {order.status === 'kuriama' || order.status === 'taisoma' ? (
          <div className="stack">
            {order.status === 'taisoma' && lastNote ? (
              <div className="alert warn">
                <p>
                  <strong>Klientas prašo pataisyti:</strong> „{lastNote.text}“
                </p>
              </div>
            ) : null}
            {hasPortrait && !(order.status === 'taisoma' && lastNote && lastNote.version === order.portraitVersion) ? (
              <>
                <p>Portretas įkeltas (versija {order.portraitVersion}). Peržiūrėkite maketą žemiau pagal KOKYBE.md ir siųskite klientui.</p>
                <form action={sendPreviewAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <button className="btn accent" type="submit">
                    Siųsti peržiūrą klientui
                  </button>
                </form>
                <PortraitUpload orderId={order.id} label="Pakeisti portretą" />
              </>
            ) : (
              <>
                <p>{order.status === 'taisoma' ? 'Pataisykite portretą ir įkelkite naują versiją.' : 'Sukurkite portretą ir įkelkite jį čia.'}</p>
                <a className="btn" href={file('photo')}>
                  Parsisiųsti kliento nuotrauką
                </a>
                <PortraitUpload orderId={order.id} label={order.status === 'taisoma' ? 'Įkelti pataisytą portretą' : 'Įkelti portretą'} />
              </>
            )}
          </div>
        ) : null}

        {order.status === 'laukia_patvirtinimo' ? (
          <div className="stack">
            <p>Peržiūra išsiųsta {formatDateTime(order.previewSentAt)}. Laukiame kliento atsakymo. Be jo patvirtinimo spaudos failas neišduodamas.</p>
            <form action={remindAction}>
              <input type="hidden" name="id" value={order.id} />
              <button className="btn ghost" type="submit">
                Išsiųsti priminimą
              </button>
            </form>
            <p className="small muted">
              Kliento nuoroda: {siteUrl()}/perziura/{order.token}
            </p>
            <PortraitUpload orderId={order.id} label="Pakeisti portretą (peržiūrą reikės siųsti iš naujo)" />
          </div>
        ) : null}

        {order.status === 'patvirtinta' ? (
          <div className="stack">
            <p>Klientas patvirtino {formatDateTime(order.approvedAt)}. Parsisiųskite spaudos failą, atiduokite spaustuvei ir pažymėkite.</p>
            <a className="btn" href={file('print')}>
              Parsisiųsti spaudos failą (PDF)
            </a>
            <form action={markPrintingAction}>
              <input type="hidden" name="id" value={order.id} />
              <button className="btn accent" type="submit">
                Atidaviau spaustuvei
              </button>
            </form>
          </div>
        ) : null}

        {order.status === 'spaudoje' ? (
          <form action={markShippedAction}>
            <input type="hidden" name="id" value={order.id} />
            <p>
              Įrėminkite, supakuokite, išsiųskite į {order.deliveryNetwork} paštomatą ({order.deliveryCity}, {order.deliveryAddress}) ir įrašykite siuntos numerį.
            </p>
            <div className="field">
              <label htmlFor="tracking">Siuntos numeris</label>
              <input id="tracking" name="tracking" type="text" required minLength={4} maxLength={40} autoComplete="off" autoCapitalize="characters" />
            </div>
            <button className="btn accent" type="submit">
              Išsiųsta: pranešti klientui
            </button>
          </form>
        ) : null}

        {order.status === 'issiusta' ? (
          <p>
            Išsiųsta {formatDateTime(order.shippedAt)}. Siuntos numeris: <strong>{order.trackingNumber}</strong>
          </p>
        ) : null}
        {order.status === 'atsaukta' ? <p>Užsakymas atšauktas.</p> : null}
      </section>

      {hasPortrait ? (
        <section aria-labelledby="maketas">
          <h2 id="maketas">Maketas (versija {order.portraitVersion})</h2>
          {warnings.length > 0 ? (
            <div className="alert warn">
              <ul>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="preview-img" src={`${file('clean')}?v=${order.portraitVersion}`} alt={`„${order.name}“ plakato maketas`} width={1200} height={order.size === 'a4' ? 1697 : 1600} />
        </section>
      ) : null}

      <section aria-labelledby="failai">
        <h2 id="failai">Failai</h2>
        {order.filesPurgedAt ? (
          <p className="muted">Failai ištrinti {formatDateTime(order.filesPurgedAt)} (saugojimo terminas baigėsi).</p>
        ) : (
          <ul className="files">
            <li>{order.photoKey ? <a href={file('photo')}>Kliento nuotrauka (JPG, {order.photoWidth}×{order.photoHeight} px)</a> : <span className="muted">Nuotraukos nėra</span>}</li>
            {hasPortrait ? (
              <>
                <li>
                  <a href={file('portrait')}>Įkeltas portretas</a>
                </li>
                <li>
                  <a href={file('preview')} target="_blank">
                    Peržiūra klientui (su vandens ženklu)
                  </a>
                </li>
                <li>
                  <a href={file('wall')} target="_blank">
                    Maketas ant sienos
                  </a>
                </li>
                <li>
                  {isApprovedForPrint(order) ? <a href={file('print')}>Spaudos failas (PDF, 300 DPI)</a> : <span className="muted">Spaudos failas: bus išduotas, kai klientas patvirtins</span>}
                </li>
              </>
            ) : null}
          </ul>
        )}
      </section>

      <section aria-labelledby="uzsakymas">
        <h2 id="uzsakymas">Užsakymas</h2>
        <dl className="kv">
          <div>
            <dt>Vardas</dt>
            <dd>{order.name}</dd>
          </div>
          <div>
            <dt>Antra eilutė</dt>
            <dd>{order.secondLine || '–'}</dd>
          </div>
          <div>
            <dt>Stilius</dt>
            <dd>{STYLE_LABELS[order.style as keyof typeof STYLE_LABELS]}</dd>
          </div>
          <div>
            <dt>Dydis</dt>
            <dd>{SIZE_LABELS[order.size as keyof typeof SIZE_LABELS]}</dd>
          </div>
          <div>
            <dt>Rėmelis</dt>
            <dd>{FRAME_LABELS[order.frame as keyof typeof FRAME_LABELS]}</dd>
          </div>
          <div>
            <dt>Kaina</dt>
            <dd>{formatPrice(order.priceCents)}</dd>
          </div>
          <div>
            <dt>Apmokėta</dt>
            <dd>{order.paidAt ? formatDateTime(order.paidAt) : 'ne'}</dd>
          </div>
          <div>
            <dt>Pristatyti iki</dt>
            <dd>{order.estimatedDelivery ? formatDateLong(order.estimatedDelivery) : '–'}</dd>
          </div>
          <div>
            <dt>Pataisymai</dt>
            <dd>{order.revisionCount}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="klientas">
        <h2 id="klientas">Klientas ir pristatymas</h2>
        <dl className="kv">
          <div>
            <dt>Vardas</dt>
            <dd>{order.customerName}</dd>
          </div>
          <div>
            <dt>El. paštas</dt>
            <dd>
              <a href={`mailto:${order.email}`}>{order.email}</a>
            </dd>
          </div>
          <div>
            <dt>Telefonas</dt>
            <dd>
              <a href={`tel:${order.phone.replace(/[^+\d]/g, '')}`}>{order.phone}</a>
            </dd>
          </div>
          <div>
            <dt>Paštomatas</dt>
            <dd>
              {order.deliveryNetwork}, {order.deliveryCity}, {order.deliveryAddress}
            </dd>
          </div>
        </dl>
      </section>

      {order.revisionNotes?.length > 0 ? (
        <section aria-labelledby="pastabos">
          <h2 id="pastabos">Kliento pastabos</h2>
          <ul className="log">
            {order.revisionNotes.map((n: { at: string; text: string; version: number }) => (
              <li key={n.at}>
                {formatDateTime(n.at)} (versijai {n.version}): „{n.text}“
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="istorija">
        <h2 id="istorija">Istorija</h2>
        <ul className="log">
          {events.map((e: { at: string; type: string; data: Record<string, unknown> }, i: number) => (
            <li key={`${e.at}-${i}`}>
              {formatDateTime(e.at)} · {EVENT_LABELS[e.type] ?? e.type}
              {e.type === 'status' && e.data?.to ? `: ${STATUS_LABELS[e.data.to as keyof typeof STATUS_LABELS] ?? e.data.to}` : ''}
              {(e.type === 'email_sent' || e.type === 'email_failed') && e.data?.kind ? `: ${e.data.kind}` : ''}
              {e.type === 'email_failed' && e.data?.error ? ` (${e.data.error})` : ''}
            </li>
          ))}
        </ul>
      </section>

      {!['issiusta', 'atsaukta'].includes(order.status) ? (
        <section aria-labelledby="atsaukti">
          <h2 id="atsaukti">Atšaukti užsakymą</h2>
          <form action={cancelAction}>
            <input type="hidden" name="id" value={order.id} />
            <label className="check">
              <input type="checkbox" name="confirm" />
              <span>Tikrai atšaukti. Klientui bus išsiųstas laiškas. Pinigus grąžinti reikia atskirai, mokėjimų paslaugos paskyroje.</span>
            </label>
            <button className="btn danger small inline" type="submit">
              Atšaukti užsakymą
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
