import Link from 'next/link';
import ExamplePair from '@/components/ExamplePair';
import { loadExamples } from '@/server/examples.js';
import { SETTINGS, SIZE_LABELS, FRAME_LABELS, formatPrice } from '@/server/settings.js';
import { deliveryStatus, formatDate, formatDateLong } from '@/server/deadline.js';
import { FRAMES } from '@/src/config.js';

// Rendered on every request: the delivery date and the Christmas cut-off must
// never be served from a stale copy.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const examples = await loadExamples();
  const d = deliveryStatus();
  const lowest = Math.min(...SETTINGS.sizes.map((s: string) => SETTINGS.prices[s as keyof typeof SETTINGS.prices]));
  const p = SETTINGS.production;
  const hero = examples[0];

  return (
    <>
      <section className="wrap hero">
        <p className="label">Augintinių portretai pagal nuotrauką</p>
        <h1>Jūsų šuns ar katės portretas su vardu</h1>
        <p className="lead">Atspausdintas, įrėmintas ir pristatytas į paštomatą.</p>

        <ExamplePair photo={hero.photo} portrait={hero.portrait} name={hero.name} priority />

        <dl className="facts">
          <div>
            <dt>Kaina</dt>
            <dd>nuo {formatPrice(lowest)}</dd>
          </div>
          <div>
            <dt>Gausite</dt>
            <dd>per {d.leadDays} darbo d.</dd>
          </div>
        </dl>

        <Link href="/uzsakymas" className="btn accent">
          Užsakyti portretą
        </Link>
        <p className="under-cta">
          {d.seasonOver || d.beforeChristmas
            ? `Užsakius šiandien, pristatysime apie ${formatDate(d.estimatedDelivery)}`
            : `Užsakius šiandien, pristatysime po Kalėdų, apie ${formatDate(d.estimatedDelivery)}`}
        </p>
      </section>

      <section className="wrap section" aria-labelledby="kaip">
        <h2 id="kaip">Kaip tai vyksta</h2>
        <ol className="steps">
          <li>
            <div>
              <h3>Įkeliate nuotrauką ir įrašote vardą</h3>
              <p>Užtrunka apie 2 minutes. Iš karto pasakome, jei nuotrauka per tamsi, per maža ar išplaukusi.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>Per {p.creationDays} darbo d. atsiunčiame peržiūrą</h3>
              <p>Paspaudžiate „Tinka“ arba parašote, ką pataisyti. Vienas pataisymas nemokamas. Kol nepatvirtinote, nespausdiname.</p>
            </div>
          </li>
          <li>
            <div>
              <h3>Atspausdiname, įrėminame, išsiunčiame</h3>
              <p>Portretas atkeliauja į jūsų pasirinktą paštomatą. Siuntos numerį atsiunčiame el. paštu.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="wrap section" aria-labelledby="pavyzdziai">
        <h2 id="pavyzdziai">Pavyzdžiai</h2>
        <div className="examples">
          {examples.map((e) => (
            <div className={e.photo || e.portrait ? 'example' : 'example empty'} key={e.index}>
              <ExamplePair photo={e.photo} portrait={e.portrait} name={e.name} />
              {e.name ? (
                <p className="caption">
                  {e.name}
                  {e.style ? <span>{e.style}</span> : null}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="dydziai">
        <h2 id="dydziai">Dydžiai ir medžiagos</h2>
        <table className="sizes">
          <tbody>
            {SETTINGS.sizes.map((s: string) => (
              <tr key={s}>
                <th scope="row">
                  {SIZE_LABELS[s as keyof typeof SIZE_LABELS]}
                  <small>su rėmeliu</small>
                </th>
                <td>{formatPrice(SETTINGS.prices[s as keyof typeof SETTINGS.prices])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Į kainą įeina portretas, spauda, rėmelis ir pristatymas į paštomatą Lietuvoje.</p>
        <p className="muted small" style={{ marginBottom: 8 }}>
          Rėmelio spalvos:
        </p>
        <ul className="swatches">
          {SETTINGS.frames.map((f: string) => (
            <li key={f}>
              <span className="swatch" style={{ background: FRAMES[f as keyof typeof FRAMES].face }} aria-hidden="true" />
              {FRAME_LABELS[f as keyof typeof FRAME_LABELS]}
            </li>
          ))}
        </ul>
        {SETTINGS.paper ? <p>Popierius: {SETTINGS.paper}.</p> : null}
        {SETTINGS.frameMaterial ? <p>Rėmelis: {SETTINGS.frameMaterial}.</p> : null}
        <p className="muted small">Trys stiliai: akvarelė, aliejus ir grafika. Stilių pasirenkate užsakydami.</p>
      </section>

      {!d.seasonOver ? (
        <section className="wrap section" aria-labelledby="kaledos">
          <div className="notice">
            {d.beforeChristmas ? (
              <>
                <h2 id="kaledos">Kalėdoms: užsakykite iki {formatDate(d.lastOrderDate)}</h2>
                <p>
                  Paskutinė diena, kai dar spėjame pristatyti iki Kalėdų, yra {formatDateLong(d.lastOrderDate)}. Į šį terminą įskaičiuotos {p.revisionBufferDays} dienos
                  peržiūrai ir pataisymui, spauda ir pristatymas.
                </p>
                <p className="muted small">Vėliau užsakytus portretus pristatysime po Kalėdų ir iš karto duosime dovanų kuponą, kurį galima atsispausdinti.</p>
              </>
            ) : (
              <>
                <h2 id="kaledos">Iki Kalėdų nebespėjame</h2>
                <p>
                  Dabar užsakytą portretą pristatysime po Kalėdų, apie {formatDate(d.estimatedDelivery)}. Apmokėję iš karto gausite dovanų kuponą (PDF) su augintinio vardu:
                  atsispausdinkite jį ir padėkite po eglute.
                </p>
              </>
            )}
          </div>
        </section>
      ) : null}

      <section className="wrap section faq" aria-labelledby="duk">
        <h2 id="duk">Dažni klausimai</h2>
        <details>
          <summary>Kokia nuotrauka tinka?</summary>
          <p>
            Tokia, kurioje snukis matosi iš arti ir aiškiai matosi akys. Geriausia fotografuoti dienos šviesoje, be blykstės. Priimame JPG, PNG ir „iPhone“ HEIC failus iki 15 MB.
            Netinka ekrano kopijos, nuotraukos, atsiųstos per „Messenger“ (jos sumažinamos), ir tamsios ar išplaukusios nuotraukos. Įkėlus nuotrauką iš karto pasakome, ar ji tinka.
          </p>
        </details>
        <details>
          <summary>Kas, jei portretas nepatiks?</summary>
          <p>
            Prieš spaudą atsiunčiame peržiūrą el. paštu. Jei kas nors netinka, tame pačiame puslapyje parašote, ką pataisyti: vienas pataisymas nemokamas. Spausdiname tik tai, ką
            patvirtinote. Jei portretas atkeliauja su defektu ar pažeistas, pagaminame iš naujo arba grąžiname pinigus.
          </p>
        </details>
        <details>
          <summary>Ar galima du gyvūnus viename portrete?</summary>
          <p>Kol kas ne: viename portrete yra vienas augintinis. Dviem augintiniams užsakykite du portretus, jie gerai atrodo pakabinti greta.</p>
        </details>
        <details>
          <summary>Ar galima užsakyti mirusio augintinio portretą?</summary>
          <p>
            Taip. Užtenka vienos nuotraukos, kurioje aiškiai matosi snukis, net jei ji sena. Antroje eilutėje po vardu galite įrašyti metus ar trumpą tekstą. Jei nuotrauka
            netobula, vis tiek įkelkite: pasakysime, ar iš jos pavyks.
          </p>
        </details>
        <details>
          <summary>Kada gausiu?</summary>
          <p>
            Per {d.leadDays} darbo dienas nuo apmokėjimo: {p.creationDays} d. portretui sukurti, iki {p.revisionBufferDays} d. peržiūrai ir pataisymui, {p.printDays} d. spaudai ir
            rėminimui, {p.deliveryDays} d. pristatymui. Kuo greičiau patvirtinsite peržiūrą, tuo greičiau gausite.
          </p>
        </details>
        <details>
          <summary>Kaip kuriamas portretas?</summary>
          <p>{SETTINGS.aiDisclosure} Vardą plakate parašome ne dirbtiniu intelektu, o tikru šriftu, todėl lietuviškos raidės visada teisingos.</p>
        </details>
      </section>

      <section className="wrap section">
        <Link href="/uzsakymas" className="btn accent">
          Užsakyti portretą
        </Link>
      </section>
    </>
  );
}
