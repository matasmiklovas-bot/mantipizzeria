import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '../_auth';
import { runSelfCheck, sendTestEmail } from '@/server/selfcheck.js';
import { launchIssues } from '@/server/settings.js';

export const metadata: Metadata = { title: 'Paslaugų patikra', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function testEmailAction() {
  'use server';
  await requireAdmin();
  let query: string;
  try {
    const to = await sendTestEmail();
    query = `ok=${encodeURIComponent(`Bandomasis laiškas išsiųstas adresu ${to}. Patikrinkite paštą (ir šlamšto aplanką).`)}`;
  } catch (err) {
    query = `klaida=${encodeURIComponent(`Laiško išsiųsti nepavyko: ${err instanceof Error ? err.message.slice(0, 200) : 'nežinoma klaida'}`)}`;
  }
  redirect(`/valdymas/patikra?${query}`);
}

export default async function SelfCheckPage({ searchParams }: { searchParams: Promise<{ ok?: string; klaida?: string }> }) {
  await requireAdmin();
  const { ok, klaida } = await searchParams;
  const results = await runSelfCheck();
  const issues = launchIssues();
  const allOk = results.every((r: { ok: boolean }) => r.ok);

  return (
    <div className="wrap admin">
      <p className="small">
        <Link href="/valdymas">← Visi užsakymai</Link>
      </p>
      <h1>Paslaugų patikra</h1>
      <p className="muted">Kiekvieną kartą atidarius šį puslapį, svetainė iš tikrųjų pabando įrašyti įrašą, išsaugoti failą ir susisiekti su mokėjimų paslauga.</p>

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

      <div className={allOk ? 'alert ok' : 'alert'} role="status">
        <p>
          <strong>{allOk ? 'Visos paslaugos veikia.' : 'Ne viskas veikia. Tikrų užsakymų dar nepriimkite.'}</strong>
        </p>
      </div>

      <dl className="kv">
        {results.map((r: { name: string; ok: boolean; detail: string }) => (
          <div key={r.name}>
            <dt>{r.name}</dt>
            <dd>
              <strong style={{ color: r.ok ? 'var(--ok)' : 'var(--bad)' }}>{r.ok ? 'Veikia. ' : 'NEVEIKIA. '}</strong>
              {r.detail}
            </dd>
          </div>
        ))}
      </dl>

      <form action={testEmailAction} style={{ marginTop: 16 }}>
        <button type="submit" className="btn ghost">
          Išsiųsti bandomąjį laišką man
        </button>
      </form>

      <h2>Nesutvarkyti nustatymai</h2>
      {issues.length === 0 ? (
        <p>Viskas sutvarkyta.</p>
      ) : (
        <ul>
          {issues.map((i: { blocking: boolean; text: string }) => (
            <li key={i.text} style={{ marginBottom: 8 }}>
              {i.blocking ? <strong>Būtina. </strong> : null}
              {i.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
