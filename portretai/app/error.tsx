'use client';

// Shown instead of the default English error page when something breaks on
// the server or in the browser. The code helps the owner find the error in
// the hosting logs.

import Link from 'next/link';

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <div className="wrap flow">
      <h1>Kažkas nepavyko</h1>
      <p>Tai mūsų klaida, ne jūsų. Jei jau mokėjote, nemokėkite antrą kartą: pirma atidarykite puslapį iš naujo. Mokėjimas niekur nedingsta.</p>
      <p className="small muted">Jei klaida kartojasi, parašykite mums ir nurodykite šį kodą: {error.digest || 'be kodo'}.</p>
      <div className="flow-nav">
        <button type="button" className="btn" onClick={() => unstable_retry()}>
          Bandyti dar kartą
        </button>
        <Link href="/" className="btn ghost">
          Į pradžią
        </Link>
      </div>
    </div>
  );
}
