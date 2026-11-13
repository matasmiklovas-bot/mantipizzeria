# TODO(savininkas): viskas, ko negaliu nuspręsti ar patikrinti už tave

Atnaujinta 2026-11-11, baigus 1 etapo kodą. Tą patį sąrašą trumpiau rodo komanda `npm run paleidimo-patikra` ir valdymo puslapis.

## A. Be šito svetainė nepriims nė vieno tikro užsakymo

| # | Ką padaryti | Kur |
|---|---|---|
| 1 | Užregistruoti individualią veiklą arba MB | Be jos „Stripe“ neaktyvuos paskyros |
| 2 | Nuspręsti dėl talpinimo: „Vercel Hobby“ komerciniam naudojimui neleidžiamas | README, skyrius „Paleidimas“, 0 punktas |
| 3 | Pasirinkti pavadinimą ir nusipirkti domeną | `server/settings.js` → `brand`; `src/config.js` → `BRAND`. Domeno patikrinti negalėjau |
| 4 | Sukurti „Supabase“ projektą ir paleisti `db/schema.sql` | README, 1 punktas |
| 5 | „Stripe“: raktai ir „webhook“ adresas | README, 2 punktas |
| 6 | „Resend“: domenas ir raktas | README, 3 punktas |
| 7 | „Vercel“: naujas projektas su Root Directory `portretai`, aplinkos kintamieji | README, 4 punktas; `.env.example` |
| 8 | Įrašyti pardavėjo rekvizitus | `server/settings.js` → `seller` |
| 9 | Gauti iš spaustuvės spaudos trukmę ir patvirtinti terminus | `server/settings.js` → `production` (dabar spėta: spauda 3 d., pristatymas 2 d.), tada `confirmed: true` |
| 10 | Patvirtinti kainas | `server/settings.js` → `prices`, `pricesConfirmed` |
| 11 | Patvirtinti paštomatų tinklus, su kuriais tikrai siunti | `server/settings.js` → `lockerNetworks`, `lockerNetworksConfirmed` |
| 12 | Perskaityti ir pataisyti teisinius puslapius, geriausia su teisininku | `app/taisykles`, `app/grazinimas`, `app/privatumas`; tada `legalReviewed: true` |
| 13 | Įkelti 3 tikrus pavyzdžius | `public/pavyzdziai/` |

## B. Bandomasis užsakymas prieš skelbiant nuorodą

Padaryk pats, su tikru telefonu ir „Stripe“ bandomuoju režimu (`sk_test_…` raktas, kortelė 4242 4242 4242 4242).

- [ ] `/valdymas` → „Paslaugų patikra“: visur „Veikia“ (išskyrus mokėjimus, kol raktas bandomasis).
- [ ] Bandomasis laiškas atėjo ir ne į šlamštą. Lietuviškos raidės laiške teisingos.
- [ ] Atidaryk svetainę per „TikTok“ ir „Instagram“ nuorodą telefone (vidinė naršyklė), ne tik „Safari“.
- [ ] Įkelk tikrą „iPhone“ nuotrauką (HEIC). Įkelk ir tyčia blogą: tamsią, mažą.
- [ ] Vardas „Žąsiukė Ąžuolė“: teisingas peržiūroje, užsakymo santraukoje ir laiške.
- [ ] Apmokėk bandomąja kortele. Atėjo laiškas tau ir „klientui“.
- [ ] „Stripe“ → „Webhooks“: paspausk „Resend“ ant to paties įvykio. Antro užsakymo ir antro laiško neatsirado.
- [ ] Valdymo puslapyje įkelk portretą, išsiųsk peržiūrą, atidaryk nuorodą iš laiško, paprašyk pataisymo, įkelk iš naujo, patvirtink.
- [ ] Parsisiųsk spaudos PDF ir atidaryk: vardas teisingas, kraštai nenukirsti.
- [ ] Pažymėk „spaudoje“, įrašyk siuntos numerį. Atėjo abu laiškai.
- [ ] Pakeisk „Stripe“ raktus į tikrus (`sk_live_…`) ir tikrą „webhook“ paslaptį. „Paslaugų patikra“ rodo „tikras režimas“.
- [ ] Vienas tikras užsakymas už tikrus pinigus sau pačiam, tada grąžink pinigus „Stripe“ paskyroje.

## C. Sprendimai, kuriuos priėmiau už tave: patvirtink arba pakeisk

| # | Sprendimas | Kur keisti |
|---|---|---|
| 14 | Pristatymas įskaičiuotas į kainą | Tekstai `app/page.tsx`, `components/OrderFlow.tsx` |
| 15 | Iki patvirtinimo grąžinama visa suma, jei portretas netinka ir po pataisymo | `app/grazinimas/page.tsx` |
| 16 | Vienas gyvūnas viename portrete | DUK, `app/page.tsx` |
| 17 | Formuluotė apie DI rodoma viešai | `server/settings.js` → `aiDisclosure`, `aiDisclosureConfirmed` |
| 18 | Mokėjimai per „Stripe“ | Žr. 19 |
| 19 | Banko nuorodų („Swedbank“, SEB) per „Stripe“ gali nebūti. Jei jų reikia, lietuviška alternatyva yra „Paysera“ (apie 0,9 %, min. 0,15 €, pagal ainora.lt 2026-10; nepatikrinta jų puslapyje ir nepatikrinta, ar tinka individualiai veiklai). Jos integracijos neparašiau | `server/payments.js` |
| 20 | Paštomatas įrašomas tekstu (tinklas, miestas, adresas), be sąrašo. Viešo sąrašo be sutarties patikimai neradau | `components/OrderFlow.tsx` |
| 21 | Nuotraukos ir portretų failai trinami po 30 dienų nuo išsiuntimo, neapmokėti įkėlimai po 48 val. | `server/settings.js` → `retentionDays`, `unpaidRetentionHours` |
| 22 | Kalėdoms pristatyti iki gruodžio 23 d.; paskutinė užsakymo diena su dabartiniais spėjimais yra gruodžio 11 d. | `server/settings.js` → `christmas`, `production` |
| 23 | Lankomumas skaičiuojamas pačios svetainės, be slapukų ir be trečiųjų šalių | `server/analytics.js` |

## C2. Pledai ir telefono dėklai (pridėta 2026-11-13)

Kainos svetainėje (pledas 59 €, dėklas 29 € su pristatymu) yra mano spėjimas. Tiekėjo dar nėra.

| # | Ką padaryti | Kur keisti |
|---|---|---|
| 30 | Rasti pledų ir dėklų gamintoją. Ką radau viešai (2026-11, tik apžvalgų tinklaraščiai, ne tiekėjų puslapiai, skaičiai tarpusavyje nesutampa): „merchOne“ flisinis pledas nuo 14,50 €, siuntimas ES nuo 3,99 €; „Gelato“ kainą rodo tik savo redaktoriuje; „Printful“ iPhone dėklas apie 7,50–14,20 $, siuntimas į ES apie 4–5,50 $. Lietuvos spaustuvių nepaklausiau | `server/settings.js` → `prices`, `pricesConfirmed` |
| 31 | Telefonų modelių sąrašą palikti tik tų, kuriuos tiekėjas gamina. Dabar įrašyti 2026-11 parduodami iPhone 13–17 ir Galaxy S23–S26, A54, A55 | `server/settings.js` → `phoneModels` |
| 32 | Patikrinti kameros vietas pagal tiekėjo šablonus (dabar nupieštos pagal viešas nuotraukas) | `src/cameras.js` |
| 33 | Pledo ir dėklo gamybos ir pristatymo trukmė. Kalėdų terminas dabar skaičiuojamas pagal paveikslų spaudą | `server/settings.js` → `production` |
| 34 | Pledo medžiaga ir skalbimo nurodymai („minkštas“ svetainėje yra spėjimas) | `server/settings.js` → `PRODUCT_NOTES`, `app/grazinimas/page.tsx` |

Šaltiniai: [merchOne ir Gelato palyginimas](https://merchone.com/blog/gelato-vs-merchone-product-specs/), [Gelato kainos 2026](https://podvector.ai/articles/print-on-demand/costs-and-suppliers/gelato-print-on-demand-pricing), [Printful dėklų kaina](https://podvector.ai/articles/printful/costs-and-charges/printful-phone-case-base-cost-full-breakdown-for-pod-sellers), [Printful kainos 2026](https://www.ecommerceceo.com/printful-pricing/), [iPhone 17 kameros](https://www.backmarket.com.au/en-au/c/iphone/iphone-17-camera-review), [Galaxy S26 datos](https://www.imaging-resource.com/news/samsung-s26-s26-and-s26-ultra-release-date-price-specs-and-where-to-buy/).

## D. Žinomi trūkumai

| # | Kas | Pasekmė |
|---|---|---|
| 24 | Nėra apsaugos nuo masinio įkėlimo ar užsakymų kūrimo (užklausų ribojimo) | Piktavalis gali užpildyti saugyklą šiukšlėmis; jos ištrinamos po 48 val. |
| 25 | Valdymo puslapio slaptažodis vienas, be antro veiksnio | Naudok ilgą atsitiktinį slaptažodį |
| 26 | Pinigų grąžinimas daromas ranka „Stripe“ paskyroje, ne iš valdymo puslapio | Atšaukus užsakymą reikia nepamiršti grąžinti pinigų |
| 27 | Portreto generavimo valdymo puslapyje nėra: portretą darai atskirai ir įkeli | „iPad“ teks naudoti kitą įrankį arba prašyti manęs paleisti generavimą |
| 28 | „Geros ir blogos nuotraukos“ pavyzdžiai yra schemos, ne nuotraukos | Geriau pakeisti dviem savo tikromis nuotraukomis |
| 29 | „Meta“ ir „TikTok“ pikselių kodas nepatikrintas su tikrais ID | Prieš mokamą reklamą patikrink jų įrankiuose, ar įvykiai ateina |

## E. Portreto kokybė (0 etapas, vis dar nebaigtas)

| # | Ką padaryti |
|---|---|
| 30 | Įkelti 3 savo augintinių nuotraukas į `pavyzdziai/` |
| 31 | Susikurti fal.ai paskyrą arba pasidaryti 3 portretus kitu įrankiu |
| 32 | Pirmą kartą paleisti generavimą su tikru raktu (`src/generate.js` su tikru API nepaleistas) |
| 33 | Perskaityti fal.ai ir modelio kūrėjo sąlygas dėl komercinio naudojimo |
| 34 | Pereiti `KOKYBE.md` su kiekvienu portretu |
| 35 | Parodyti `apklausa.html` bent 10 žmonių, kurie nėra tavo draugai |
| 36 | Perkalibruoti nuotraukos patikros slenksčius su 20+ tikrų nuotraukų (`src/config.js` → `PHOTO`) |
| 37 | Atspausdinti vieną bandomąjį plakatą; sužinoti spaustuvės failo reikalavimus (`src/pdf.js`, `src/config.js` → `BLEED_PX`) |
| 38 | Išmatuoti, kiek rėmelio kraštas uždengia atspaudo (`src/config.js` → `SAFE_MM`) |
