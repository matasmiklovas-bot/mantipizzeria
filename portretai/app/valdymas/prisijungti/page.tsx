import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { isAdmin } from '../_auth';
import { loginAction } from '../actions';

export const metadata: Metadata = { title: 'Prisijungimas', robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ klaida?: string }> }) {
  if (await isAdmin()) redirect('/valdymas');
  const { klaida } = await searchParams;
  const configured = (process.env.ADMIN_PASSWORD || '').length >= 10;
  return (
    <div className="wrap flow admin">
      <h1>Valdymas</h1>
      {!configured ? (
        <div className="alert" role="alert">
          <p>Prisijungimas išjungtas: talpinimo nustatymuose nenustatytas ADMIN_PASSWORD (bent 10 ženklų).</p>
        </div>
      ) : null}
      {klaida ? (
        <div className="alert" role="alert">
          <p>Slaptažodis neteisingas.</p>
        </div>
      ) : null}
      <form action={loginAction}>
        <div className="field">
          <label htmlFor="password">Slaptažodis</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button type="submit" className="btn">
          Prisijungti
        </button>
      </form>
    </div>
  );
}
