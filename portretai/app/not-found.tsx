import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap flow">
      <h1>Puslapis nerastas</h1>
      <p>Nuoroda neteisinga arba nebegalioja. Jei atėjote iš mūsų laiško, nukopijuokite visą nuorodą iš naujo.</p>
      <Link href="/" className="btn ghost">
        Į pradžią
      </Link>
    </div>
  );
}
