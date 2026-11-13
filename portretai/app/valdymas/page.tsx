import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from './_auth';
import { logoutAction } from './actions';
import { db } from '@/server/db.js';
import { purgeExpired } from '@/server/orders.js';
import { eventSummary } from '@/server/analytics.js';
import { STATUSES, STATUS_LABELS, STYLE_LABELS, describeProduct, launchIssues } from '@/server/settings.js';
import { formatDateTime, currentTime, deliveryStatus, formatDateLong } from '@/server/deadline.js';

export const metadata: Metadata = { title: 'Užsakymai', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const MY_MOVE = ['apmoketa', 'kuriama', 'taisoma', 'patvirtinta', 'spaudoje'];
const HIDDEN_BY_DEFAULT = ['laukia_apmokejimo', 'atsaukta', 'issiusta'];

export function badgeClass(status: string) {
  if (MY_MOVE.includes(status)) return 'badge todo-me';
  if (status === 'laukia_patvirtinimo' || status === 'laukia_apmokejimo') return 'badge wait';
  if (status === 'issiusta') return 'badge done';
  return 'badge';
}

export default async function AdminList({ searchParams }: { searchParams: Promise<{ busena?: string }> }) {
  await requireAdmin();
  const { busena } = await searchParams;

  // Retention runs whenever the owner opens the list: no scheduler to maintain.
  let purged: { uploads: number; unpaid: number; finished: number } | null = null;
  try {
    purged = await purgeExpired();
  } catch (err) {
    console.error('[purge]', err);
  }

  const all = await (await db()).listOrders();
  const counts = Object.fromEntries(STATUSES.map((s: string) => [s, all.filter((o: any) => o.status === s).length]));
  const shown = busena && STATUSES.includes(busena) ? all.filter((o: any) => o.status === busena) : all.filter((o: any) => !HIDDEN_BY_DEFAULT.includes(o.status));
  const issues = launchIssues();
  const stats = await eventSummary(14);
  const d = deliveryStatus();
  const now = currentTime().getTime();

  return (
    <div className="wrap admin">
      <h1>Užsakymai</h1>

      {issues.length > 0 ? (
        <details className="alert warn">
          <summary>
            <strong>Dar nesutvarkyta prieš paleidimą: {issues.length}</strong>
          </summary>
          <ul style={{ marginTop: 8 }}>
            {issues.map((i: { blocking: boolean; text: string }) => (
              <li key={i.text}>
                {i.blocking ? <strong>Būtina. </strong> : null}
                {i.text}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="small muted">
        {d.beforeChristmas ? `Paskutinė diena užsakyti iki Kalėdų: ${formatDateLong(d.lastOrderDate)}.` : 'Nauji užsakymai jau žymimi „po Kalėdų“.'}
        {purged && purged.uploads + purged.unpaid + purged.finished > 0
          ? ` Ištrinta pasenusių failų: ${purged.uploads} neapmokėtų įkėlimų, ${purged.unpaid} neapmokėtų užsakymų, ${purged.finished} užbaigtų užsakymų.`
          : ''}
      </p>

      <nav className="chips" aria-label="Būsenos">
        <Link className="chip" href="/valdymas" aria-current={!busena ? 'page' : undefined}>
          Aktyvūs ({all.filter((o: any) => !HIDDEN_BY_DEFAULT.includes(o.status)).length})
        </Link>
        {STATUSES.map((s: string) => (
          <Link className="chip" key={s} href={`/valdymas?busena=${s}`} aria-current={busena === s ? 'page' : undefined}>
            {STATUS_LABELS[s as keyof typeof STATUS_LABELS]} ({counts[s]})
          </Link>
        ))}
      </nav>

      {shown.length === 0 ? (
        <p className="muted">Užsakymų čia nėra.</p>
      ) : (
        <ul className="order-list">
          {shown.map((o: any) => {
            const waitingHours = o.status === 'laukia_patvirtinimo' && o.previewSentAt ? Math.floor((now - new Date(o.previewSentAt).getTime()) / 3600000) : 0;
            return (
              <li key={o.id}>
                <Link href={`/valdymas/${o.id}`}>
                  <strong>{o.name}</strong>
                  <span className={badgeClass(o.status)}>{STATUS_LABELS[o.status as keyof typeof STATUS_LABELS]}</span>
                  <span className="meta">
                    {o.code} · {STYLE_LABELS[o.style as keyof typeof STYLE_LABELS]} · {describeProduct(o)} · {formatDateTime(o.paidAt || o.createdAt)}
                    {o.afterChristmas ? ' · po Kalėdų' : ''}
                    {waitingHours >= 24 ? ` · klientas tyli ${Math.floor(waitingHours / 24)} d.` : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2>Lankomumas per 14 dienų</h2>
      {stats.days.length === 0 ? (
        <p className="muted small">Duomenų dar nėra.</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="plain">
              <thead>
                <tr>
                  <th scope="col">Diena</th>
                  <th scope="col">Puslapiai</th>
                  <th scope="col">Pradėjo</th>
                  <th scope="col">Nuotrauka tiko</th>
                  <th scope="col">Netiko</th>
                  <th scope="col">Iki mokėjimo</th>
                </tr>
              </thead>
              <tbody>
                {stats.days.map((row: any) => (
                  <tr key={row.day}>
                    <td>{row.day}</td>
                    <td>{row.page}</td>
                    <td>{row.order_start}</td>
                    <td>{row.photo_ok}</td>
                    <td>{row.photo_rejected}</td>
                    <td>{row.checkout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.sources.length > 0 ? (
            <p className="small muted" style={{ marginTop: 10 }}>
              Iš kur ateina: {stats.sources.map((s: { source: string; count: number }) => `${s.source} (${s.count})`).join(', ')}
            </p>
          ) : null}
        </>
      )}

      <p style={{ marginTop: 28 }}>
        <Link href="/valdymas/patikra">Paslaugų patikra: ar veikia bazė, failai, mokėjimai ir laiškai</Link>
      </p>

      <form action={logoutAction} style={{ marginTop: 16 }}>
        <button type="submit" className="btn ghost small inline">
          Atsijungti
        </button>
      </form>
    </div>
  );
}
