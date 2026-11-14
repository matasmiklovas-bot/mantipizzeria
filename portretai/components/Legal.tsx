// Shared pieces of the legal pages.

import { SETTINGS, contactEmail } from '@/server/settings.js';

/** Visible until the owner sets legalReviewed in server/settings.js. */
export function DraftNotice() {
  if (SETTINGS.legalReviewed) return null;
  return (
    <p className="draft" role="note">
      <strong>Juodraštis: reikia savininko peržiūros.</strong> Šis tekstas parengtas kaip pradinis variantas ir nėra teisinė konsultacija. Prieš priimant tikrus užsakymus jį turi
      peržiūrėti ir patvirtinti pardavėjas, pageidautina kartu su teisininku.
    </p>
  );
}

function Value({ value, what }: { value: string | null; what: string }) {
  return value ? <>{value}</> : <span className="todo">TODO(savininkas): {what}</span>;
}

export function SellerDetails() {
  const s = SETTINGS.seller;
  return (
    <ul>
      <li>
        Pardavėjas: <Value value={s.name} what="vardas, pavardė arba įmonės pavadinimas" />
      </li>
      <li>
        Veiklos pagrindas: <Value value={s.activityNumber} what="individualios veiklos pažymos numeris arba įmonės kodas" />
      </li>
      <li>
        Adresas: <Value value={s.address} what="adresas korespondencijai" />
      </li>
      <li>
        El. paštas: <Value value={contactEmail()} what="el. pašto adresas" />
      </li>
      {s.phone ? <li>Telefonas: {s.phone}</li> : null}
    </ul>
  );
}
