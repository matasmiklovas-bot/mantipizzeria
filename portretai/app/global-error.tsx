'use client';

// Last resort when even the page frame (header, footer) fails. It has no
// access to the site stylesheet, so the few styles it needs are inline.

export default function GlobalError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <html lang="lt">
      <body style={{ margin: 0, background: '#f6f2ea', color: '#26221d', font: '17px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
        <title>Kažkas nepavyko</title>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px' }}>
          <h1 style={{ font: '500 34px/1.15 Georgia, serif', margin: '0 0 14px' }}>Kažkas nepavyko</h1>
          <p>Tai mūsų klaida, ne jūsų. Pabandykite atidaryti puslapį dar kartą.</p>
          <p style={{ color: '#655d52', fontSize: 15 }}>Jei klaida kartojasi, parašykite mums ir nurodykite šį kodą: {error.digest || 'be kodo'}.</p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{ font: 'inherit', fontWeight: 600, color: '#fff', background: '#26221d', border: 0, borderRadius: 6, padding: '15px 22px', width: '100%', cursor: 'pointer' }}
          >
            Bandyti dar kartą
          </button>
        </main>
      </body>
    </html>
  );
}
