import Link from 'next/link';
import ExamplePair from '@/components/ExamplePair';
import SizeScale from '@/components/SizeScale';
import StyleTrio from '@/components/StyleTrio';
import { loadStyle } from '@/src/styles.js';
import { loadExamples } from '@/server/examples.js';
import { SETTINGS, SIZE_LABELS, FRAME_LABELS, STYLE_LABELS, PRODUCT_NOTES, formatPrice, minPrice } from '@/server/settings.js';
import { deliveryStatus, formatDate, formatDateLong } from '@/server/deadline.js';
import { SIZES } from '@/src/config.js';

// Rendered on every request: the delivery date and the Christmas cut-off must
// never be served from a stale copy.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const examples = await loadExamples();
  const d = deliveryStatus();
  const lowest = minPrice();
  const p = SETTINGS.production;
  const hero = examples[0];
  // All three examples are the same pet from the same photo: show the photo once.
  const oneAnimal =
    examples.every((e) => e.photo && e.portrait && e.name === hero.name && e.photo.src && e.style) &&
    new Set(examples.map((e) => `${e.photo?.width}x${e.photo?.height}`)).size === 1;
  const styleKey = (label: string | null) => (Object.keys(STYLE_LABELS) as (keyof typeof STYLE_LABELS)[]).find((k) => STYLE_LABELS[k] === label);

  return (
    <>
      <section className="wrap hero">
        <p className="label">Augintinių portretai pagal nuotrauką</p>
        <h1>
          Jūsų šuns ar katės portretas <span className="ink-mark">su vardu</span>
        </h1>
        <p className="lead">Įrėmintas paveikslas, pledas arba telefono dėklas. Pristatome į paštomatą.</p>

        <ExamplePair photo={hero.photo} portrait={hero.portrait} name={hero.name} frame="azuolas" priority />

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
              <h3>Atspausdiname ir išsiunčiame</h3>
              <p>Paveikslą įrėminame, pledą ir dėklą atspausdiname. Užsakymas atkeliauja į jūsų pasirinktą paštomatą. Siuntos numerį atsiunčiame el. paštu.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="wrap section" aria-labelledby="pavyzdziai">
        <h2 id="pavyzdziai">{oneAnimal ? 'Viena nuotrauka, trys stiliai' : 'Pavyzdžiai'}</h2>
        {oneAnimal && hero.photo && hero.name ? (
          <StyleTrio
            name={hero.name}
            photo={hero.photo}
            items={examples.map((e, i) => {
              const key = styleKey(e.style);
              return {
                style: e.style ?? '',
                description: key ? loadStyle(key).description : '',
                portrait: e.portrait!,
                frame: ['azuolas', 'juodas', 'baltas'][i % 3],
              };
            })}
          />
        ) : (
          <div className="examples">
            {examples.map((e, i) => (
              <div className={e.photo || e.portrait ? 'example' : 'example empty'} key={e.index}>
                <ExamplePair photo={e.photo} portrait={e.portrait} name={e.name} frame={['azuolas', 'juodas', 'baltas'][i % 3]} />
                {e.name ? (
                  <p className="caption">
                    {e.name}
                    {e.style ? <span>{e.style}</span> : null}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="wrap section" aria-labelledby="ne-tik">
        <h2 id="ne-tik">Ne tik ant sienos</h2>
        <p className="section-lead">Tas pats portretas ir vardas, tik kitur: ant pledo sofoje arba ant telefono dėklo.</p>
        <div className="goods">
          <figure className="good good--pledas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/produktai/pledas-900.jpg"
              srcSet="/produktai/pledas-480.jpg 480w, /produktai/pledas-900.jpg 900w"
              sizes="(min-width: 900px) 520px, 100vw"
              alt="Pledas su Lego portretu akvarelės stiliumi ir vardu, pakabintas ant medinio skersinio"
              width={900}
              height={1125}
              loading="lazy"
            />
            <figcaption>
              <span className="good-name">Pledas</span>
              <span className="good-price">{formatPrice(SETTINGS.prices.pledas)}</span>
              <span className="good-note">{PRODUCT_NOTES.pledas}</span>
              <Link href="/uzsakymas?gaminys=pledas">Užsakyti pledą</Link>
            </figcaption>
          </figure>
          <figure className="good good--deklas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/produktai/deklas-900.jpg"
              srcSet="/produktai/deklas-480.jpg 480w, /produktai/deklas-900.jpg 900w"
              sizes="(min-width: 900px) 400px, 80vw"
              alt="Telefono dėklas su Lego portretu grafikos stiliumi ir vardu"
              width={900}
              height={1286}
              loading="lazy"
            />
            <figcaption>
              <span className="good-name">Telefono dėklas</span>
              <span className="good-price">{formatPrice(SETTINGS.prices.deklas)}</span>
              <span className="good-note">{PRODUCT_NOTES.deklas} Portretą išdėstome taip, kad kamera neuždengtų snukio.</span>
              <Link href="/uzsakymas?gaminys=deklas">Užsakyti dėklą</Link>
            </figcaption>
          </figure>
        </div>
        <p className="muted small">Vaizdai sukurti kompiuteriu iš tikro spaudos failo: taip gaminys atrodys, bet tai ne nuotrauka.</p>
      </section>

      <section className="wrap section" aria-labelledby="dydziai">
        <h2 id="dydziai">Paveikslų dydžiai</h2>
        <SizeScale
          image={hero.portrait}
          sizes={SETTINGS.sizes.map((s: string) => {
            const size = SIZES[s as keyof typeof SIZES];
            return {
              key: s,
              label: SIZE_LABELS[s as keyof typeof SIZE_LABELS],
              price: `${formatPrice(SETTINGS.prices[s as keyof typeof SETTINGS.prices])} su rėmeliu`,
              w: size.widthMm / 10,
              h: size.heightMm / 10,
            };
          })}
        />
        <p>Į kainą įeina portretas, spauda, rėmelis ir pristatymas į paštomatą Lietuvoje.</p>
        <p className="muted small" style={{ marginBottom: 8 }}>
          Rėmelio spalvos:
        </p>
        <ul className="swatches">
          {SETTINGS.frames.map((f: string) => (
            <li key={f}>
              <span className={`frame frame--${f} mini`} aria-hidden="true">
                <span className="glass" />
              </span>
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
                  Paskutinė diena, kai dar spėjame pristatyti iki Kalėdų, yra {formatDateLong(d.lastOrderDate)}. Į šį terminą įskaičiuotos {p.revisionBufferDays} dienos peržiūrai
                  ir pataisymui, spauda ir pristatymas.
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
            Per {d.leadDays} darbo dienas nuo apmokėjimo: {p.creationDays} d. portretui sukurti, iki {p.revisionBufferDays} d. peržiūrai ir pataisymui, {p.printDays} d. spaudai, {p.deliveryDays} d. pristatymui. Kuo greičiau patvirtinsite peržiūrą, tuo greičiau gausite.
          </p>
        </details>
        <details>
          <summary>Kaip kuriamas portretas?</summary>
          <p>{SETTINGS.aiDisclosure} Vardą parašome tikru šriftu, todėl lietuviškos raidės visada teisingos.</p>
        </details>
      </section>

      <section className="closing" aria-labelledby="pabaiga">
        <div className="wrap">
          <h2 id="pabaiga">Užsakymas užtrunka apie 2 minutes</h2>
          <p>Nuotrauka, vardas, stilius ir paštomatas. Peržiūrą atsiųsime per {p.creationDays} darbo d., spausdinsime tik jums patvirtinus.</p>
          <Link href="/uzsakymas" className="btn paper">
            Užsakyti portretą
          </Link>
        </div>
      </section>
    </>
  );
}
