import type { Metadata } from 'next';
import Link from 'next/link';
import { DraftNotice } from '@/components/Legal';
import { contactEmail } from '@/server/settings.js';

export const metadata: Metadata = { title: 'Grąžinimas ir brokas' };

export default function ReturnsPage() {
  const contact = contactEmail();
  return (
    <div className="wrap prose">
      <h1>Grąžinimas ir brokas</h1>
      <DraftNotice />

      <h2>Jei portretas nepatinka dar neatspausdintas</h2>
      <p>
        Prieš spaudą atsiunčiame peržiūrą. Jei kas nors netinka, peržiūros puslapyje parašykite, ką pataisyti: vienas pataisymas nemokamas. Jei ir pataisytas portretas netinka,
        parašykite mums{contact ? ` (${contact})` : ''}, kol jo nepatvirtinote: grąžinsime sumokėtą sumą.
      </p>
      <p>
        <span className="todo">TODO(savininkas): patvirtinti, kad iki patvirtinimo grąžinate visą sumą. Tai jūsų sprendimas, ne įstatymo reikalavimas.</span>
      </p>

      <h2>Jei portretas jau patvirtintas ir atspausdintas</h2>
      <p>
        Portretas pagamintas pagal jūsų nuotrauką ir jūsų patvirtintą peržiūrą, todėl kokybiško portreto grąžinti ar pakeisti vien todėl, kad apsigalvojote, negalime. Plačiau:{' '}
        <Link href="/taisykles">pirkimo taisyklės</Link>, 7 punktas.
      </p>

      <h2>Jei portretas su defektu arba atkeliavo pažeistas</h2>
      <p>Brokas yra, pavyzdžiui:</p>
      <ul>
        <li>sudužęs stiklas, sulūžęs ar subraižytas rėmelis;</li>
        <li>sulankstytas, suplėšytas ar sušlapęs atspaudas;</li>
        <li>spaudos defektas: dryžiai, dėmės, aiškiai ne tos spalvos nei patvirtintoje peržiūroje;</li>
        <li>ne tas vardas, stilius, dydis ar rėmelio spalva nei užsakyta.</li>
      </ul>
      <p>Ką daryti:</p>
      <ul>
        <li>nufotografuokite pakuotę ir portretą;</li>
        <li>atsakykite į bet kurį mūsų laišką{contact ? ` arba parašykite ${contact}` : ''}, nurodykite užsakymo numerį ir pridėkite nuotraukas;</li>
        <li>atsakysime per 3 darbo dienas.</li>
      </ul>
      <p>Patvirtinus broką, savo sąskaita pagaminsime ir išsiųsime naują portretą arba, jei taip norite, grąžinsime pinigus. Brokuoto portreto siųsti atgal nereikia, nebent paprašysime.</p>
      <p>
        <span className="todo">TODO(savininkas): įrašyti, per kiek laiko pirkėjas turi pranešti apie pažeistą siuntą, ir suderinti su vežėjo taisyklėmis dėl žalos atlyginimo.</span>
      </p>

      <h2>Pinigų grąžinimas</h2>
      <p>Pinigus grąžiname tuo pačiu būdu, kuriuo mokėjote. Jūsų įstatymų suteiktos vartotojo teisės dėl netinkamos kokybės prekių galioja visada ir šis puslapis jų neriboja.</p>
    </div>
  );
}
