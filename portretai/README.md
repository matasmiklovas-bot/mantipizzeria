# Portretai: svetainė ir plakato įrankis

Šiame aplanke yra du dalykai, kurie naudoja tą patį maketavimo kodą:

1. **Svetainė** (aplankai `app/`, `components/`, `server/`): užsakymo kelias, apmokėjimas, peržiūros patvirtinimas, valdymo puslapis.
2. **Komandinės eilutės įrankis** (`bin/`, `src/`): iš nuotraukos ar paruošto portreto padaro spaudos failą.

Picerijos svetainės kodo šis aplankas neliečia.

> **Būsena.** Svetainė surinkta ir ištestuota vietoje su pakaitalais: duomenų baze faile, bandomuoju mokėjimo puslapiu ir laiškų dėžute faile. Su tikromis „Supabase“, „Stripe“ ir „Resend“ paskyromis ji dar nepaleista nė karto. Ką tiksliai reikia padaryti, surašyta skyriuje „Paleidimas“.

---

## Kaip veikia užsakymas

1. Klientas įkelia nuotrauką. Svetainė iš karto pasako, jei ji per maža, per tamsi ar išplaukusi.
2. Įrašo vardą ir mato jį plakato šriftu.
3. Pasirenka stilių, dydį, rėmelio spalvą.
4. Įrašo paštomatą ir kontaktus, apmoka.
5. Tu gauni laišką, klientas gauna patvirtinimą.
6. Tu sukuri portretą, įkeli jį valdymo puslapyje, svetainė sumaketuoja plakatą.
7. Klientas gauna laišką su peržiūra ir paspaudžia „Tinka“ arba „Noriu pataisymo“ (vienas nemokamas).
8. Tik po „Tinka“ svetainė išduoda spaudos failą.
9. Atiduodi spaustuvei, įrėmini, išsiunti, įrašai siuntos numerį. Klientas apie kiekvieną žingsnį gauna laišką.

Būsenos: apmokėta → kuriama → laukia patvirtinimo → taisoma → patvirtinta → spaudoje → išsiųsta.

---

## Paleidimas

Viską galima padaryti naršyklėje, taip pat ir „iPad“. Nieko neregistravau ir neužsakiau už tave.

### 0. Talpinimo problema, kurią turi išspręsti pirmiausia

„Vercel“ nemokamas planas („Hobby“) pagal jų sąlygas skirtas tik nekomerciniam naudojimui. Parduotuvė yra komercinė. Variantai:

| Variantas | Kaina | Pastaba |
|---|---|---|
| „Vercel Pro“ tik sezonui (2 mėn.) | apie 40 $ | Paprasčiausia: viskas veikia taip pat kaip picerijoje. Po Kalėdų atšauki. Viršija 40 € biudžetą maždaug 10 € kartu su domenu |
| „Netlify“ nemokamas planas | 0 € | Komercinį naudojimą leidžia, bet šios svetainės ten nebandžiau; plakato maketavimas gali netilpti į jų laiko ribą |
| Likti „Vercel Hobby“ | 0 € | Pažeidžia „Vercel“ sąlygas. Nerekomenduoju |

Kodas nuo „Vercel“ nepriklauso: tai įprasta „Next.js“ svetainė.

### 1. „Supabase“ (duomenys ir nuotraukos)

1. supabase.com → „New project“. Regioną rinkis Europoje (pvz., Frankfurt).
2. „SQL Editor“ → įklijuok viską iš failo `db/schema.sql` → „Run“.
3. „Project Settings“ → „API“: nusikopijuok „Project URL“ ir **service_role** raktą.

Nemokamas planas: 500 MB duomenų, 1 GB failų, projektas sustabdomas po savaitės be veiklos. 1 GB užtenka maždaug 40 vienu metu aktyvių užsakymų; svetainė pati trina failus praėjus 30 dienų po išsiuntimo.

### 2. „Stripe“ (mokėjimai)

1. Paskyrą aktyvuok savo veiklai (reikės individualios veiklos pažymos arba įmonės duomenų).
2. „Developers“ → „API keys“: nusikopijuok „Secret key“.
3. „Developers“ → „Webhooks“ → „Add endpoint“:
   - adresas: `https://TAVO-DOMENAS/api/mokejimas/webhook`
   - įvykiai: `checkout.session.completed` ir `checkout.session.async_payment_succeeded`
   - nusikopijuok „Signing secret“ (`whsec_…`).

Mokestis: 1,5 % + 0,25 € už Europos kortelę (pagal stripe.com/en-lt/pricing, tikrinta 2026-11-11). Ar „Stripe“ Lietuvoje rodo „Swedbank“ ir SEB banko nuorodas, patikrinti nepavyko: pažiūrėk savo „Stripe“ paskyroje „Settings“ → „Payment methods“. Jei ne, žr. `TODO.md` apie „Paysera“.

### 3. „Resend“ (laiškai)

1. resend.com → pridėk savo domeną ir įrašyk jų nurodytus DNS įrašus pas domeno registratorių.
2. Sukurk API raktą.

Nemokamas planas: 3000 laiškų per mėnesį, 100 per dieną. Vienam užsakymui išsiunčiama apie 7 laiškus, taigi riba yra maždaug 14 užsakymų per dieną.

### 4. Talpinimas („Vercel“)

1. „Add New“ → „Project“ → ta pati „GitHub“ saugykla.
2. **Root Directory: `portretai`**. Tai svarbiausias nustatymas: be jo bus surinkta picerija.
3. „Environment Variables“: įrašyk viską iš `.env.example` (išskyrus `FAL_KEY`).
4. „Deploy“.
5. „Settings“ → „Domains“: pridėk savo domeną.

### 5. Užpildyk `server/settings.js`

Tai vienintelis failas, kurį reikia redaguoti: kainos, spaudos ir pristatymo trukmė, pardavėjo rekvizitai, paštomatų tinklai, popierius. „GitHub“ puslapyje atidaryk failą, spausk pieštuko ikoną, pataisyk, „Commit changes“. Svetainė atsinaujins pati per porą minučių.

### 6. Patikrink

1. Atidaryk `https://TAVO-DOMENAS/valdymas`, prisijunk.
2. Apačioje spausk „Paslaugų patikra“. Puslapis pats pabando įrašyti į bazę, išsaugoti failą ir susisiekti su „Stripe“. Visur turi būti „Veikia“.
3. Spausk „Išsiųsti bandomąjį laišką man“ ir patikrink paštą.
4. Padaryk bandomąjį užsakymą nuo pradžios iki galo (žr. `TODO.md`).

---

## Kaip atnaujinti

Bet koks pakeitimas, įkeltas į saugyklos pagrindinę šaką, per porą minučių atsiranda svetainėje. Iš kompiuterio tai viena komanda:

```
git push
```

Iš „iPad“: redaguok failą „GitHub“ puslapyje ir spausk „Commit changes“.

Dažniausi pakeitimai:

| Ką keisti | Kur |
|---|---|
| Kainos, terminai, rekvizitai, paštomatų tinklai | `server/settings.js` |
| Tikri pavyzdžiai pagrindiniame puslapyje | `public/pavyzdziai/` (žr. `SKAITYK.txt` ten) |
| Stiliaus promptas | `stiliai/<stilius>.txt` |
| Šriftas ir vardo dydis plakate | `stiliai/<stilius>.json` |
| Laiškų tekstai | `server/email-templates.js` |
| Teisiniai puslapiai | `app/taisykles/`, `app/grazinimas/`, `app/privatumas/` |

---

## Ką darau kasdien, gavęs užsakymą

Viskas vyksta puslapyje `/valdymas`, veikia telefone.

1. **Gavai laišką „Naujas užsakymas“.** Atidaryk užsakymą.
2. **Parsisiųsk kliento nuotrauką.** Ji jau paversta į JPG, net jei klientas kėlė HEIC.
3. **Sukurk portretą** savo įrankiu arba komanda `portretas kurti` (žr. žemiau). Portretas turi būti be vardo: vardą uždeda svetainė.
4. **Įkelk portretą** mygtuku „Įkelti portretą“. Po maždaug 15 sekundžių pamatysi sumaketuotą plakatą.
5. **Pereik `KOKYBE.md` sąrašą.** Jei kas nors netinka, perdaryk ir įkelk iš naujo.
6. **Spausk „Siųsti peržiūrą klientui“.**
7. **Lauk.** Jei klientas tyli parą, sąraše prie užsakymo atsiras „klientas tyli 1 d.“: spausk „Išsiųsti priminimą“.
8. **Klientas paprašė pataisymo:** gausi laišką su jo pastaba. Pataisyk, įkelk, siųsk peržiūrą iš naujo.
9. **Klientas patvirtino:** gausi laišką. Parsisiųsk spaudos failą (PDF) ir nusiųsk spaustuvei. Spausk „Atidaviau spaustuvei“.
10. **Atsiėmei atspaudą:** pereik `KOKYBE.md` 6 skyrių, įrėmink, supakuok, išsiųsk.
11. **Įrašyk siuntos numerį** ir spausk „Išsiųsta: pranešti klientui“.

Kartą per dieną atidaryk užsakymų sąrašą: taip pat ištrinami pasenę failai (neapmokėti įkėlimai po 48 val., išsiųstų užsakymų failai po 30 dienų).

---

## Jei kas nors sugenda

| Kas matosi | Ką daryti |
|---|---|
| Svetainė rodo klaidą vietoje puslapio | „Vercel“ → „Deployments“: jei paskutinis raudonas, spausk ant ankstesnio žalio → „Promote to Production“. Tada parašyk man |
| Klientas sumokėjo, bet užsakymo sąraše nėra arba jis „Laukia apmokėjimo“ | „Stripe“ → „Developers“ → „Webhooks“: pažiūrėk, ar pristatymas nepavyko, ir spausk „Resend“. Pakartotinis pranešimas dvigubo užsakymo nesukuria |
| Klientas negavo laiško | Užsakymo puslapio „Istorijoje“ ieškok „LAIŠKAS NEIŠSIŲSTAS“. Patikrink „Resend“ paskyrą (riba 100 per dieną). Kliento nuoroda į peržiūrą yra užsakymo puslapyje: nusiųsk ją pats |
| „Paslaugų patikra“ rodo „NEVEIKIA“ | Šalia parašyta priežastis. Dažniausiai neteisingas arba pasibaigęs raktas „Vercel“ nustatymuose |
| Neprisijungia prie `/valdymas` | Patikrink `ADMIN_PASSWORD` ir `SESSION_SECRET` „Vercel“ nustatymuose; pakeitus reikia „Redeploy“ |
| Įkėlus portretą rašo „Portretas per mažas“ | Trumpoji kraštinė turi būti bent 1000 px; geriausia 2000 px ir daugiau |
| Maketo įspėjimas „padidintas daugiau nei 2,5 karto“ | Atspaudas bus minkštas. Sugeneruok didesne raiška (`--raiska 4K`) |
| Klientas nori keisti jau patvirtintą portretą | Svetainė to neleidžia tyčia. Jei dar neatidavei spaustuvei, atšauk užsakymą ir sukurk naują arba susitark laišku |
| Mokėjimas už atšauktą užsakymą | Gausi laišką „Mokėjimo problema“. Grąžink pinigus „Stripe“ paskyroje |
| „Supabase“ projektas sustabdytas | Nutinka po savaitės be veiklos. „Supabase“ → „Restore project“. Duomenys nedingsta |

---

## Komandinės eilutės įrankis

Reikia „Windows“ kompiuterio su „Node.js“ 22 ar naujesne versija (nodejs.org, mygtukas „LTS“). „iPad“ šių komandų paleisti negali.

```
npm install
node bin/portretas.js kurti --nuotrauka pavyzdziai/reksas.jpg --vardas "Reksas" --stilius akvarele --dydis 30x40
```

| Nustatymas | Ką daro |
|---|---|
| `--antra-eilute "2014 – 2026"` | Antra eilutė po vardu |
| `--paruostas-portretas kelias.png` | Naudoja tavo paruoštą portretą, vaizdo modelio nekviečia |
| `--remelis juodas` | Rėmelio spalva sienos makete: `juodas`, `baltas`, `azuolas` |
| `--dydis a4` | Dydžiai: `30x40`, `a4` |
| `--raiska 4K` | Modelio raiška: `1K`, `2K`, `4K` |
| `--is-naujo` | Generuoja iš naujo, nors portretas jau sugeneruotas |

Rezultatas atsiranda aplanke `isvestis/<vardas>-<stilius>-<dydis>/`: `spauda.pdf`, `perziura.jpg`, `plakatas.jpg`, `siena.jpg`, `portretas-modelio.png`. Į svetainę kelk `portretas-modelio.png`, ne plakatą.

Kitos komandos:

```
node bin/portretas.js tikrinti-nuotrauka pavyzdziai/reksas.jpg
node bin/portretas.js tikrinti-spauda isvestis/reksas-akvarele-30x40/spauda.pdf --dydis 30x40
node bin/portretas.js apklausa isvestis/a isvestis/b isvestis/c --kaina 35
node bin/portretas.js stiliai
```

---

## Testai

```
npm test            # 41 testas: nuotraukos, maketas, spaudos failas, užsakymų logika
npm run test:e2e    # 12 testų: visas užsakymo kelias naršyklėje telefono dydžiu
npm run paleidimo-patikra   # kas dar nesutvarkyta prieš paleidimą
```

`test:e2e` reikia „Playwright“ su „Chromium“ naršykle.

Kas patikrinta automatiškai:

- Nuotraukos įkėlimas: HEIC, JPG, PNG; per maža, per tamsi, išplaukusi nuotrauka atmetama iš karto.
- Vardas „Žąsiukė Ąžuolė“ teisingai rodomas svetainėje, laiške ir spaudos faile (spaudos faile tikrinami patys pikseliai).
- Mokėjimo pranešimas, gautas du ar daugiau kartų, sukuria vieną apmokėtą užsakymą ir vieną laišką. Suklastotas pranešimas atmetamas.
- Peržiūros patvirtinimas: be patvirtinimo spaudos failas neišduodamas; pakeitus portretą senas patvirtinimas nebegalioja; antras nemokamas pataisymas nesiūlomas.
- Visos būsenos ir kiekvienos laiškas.
- Spaudos PDF: formatas, 300 DPI, užlaidos ≥ 3 mm, sRGB.
- Kalėdų terminas: po paskutinės dienos svetainė persijungia ir duoda dovanų kuponą.
- Nuotraukos neprieinamos be prisijungimo.
- Pirmas ekranas 375×667 telefone: pavyzdys, kaina, terminas ir mygtukas telpa neslenkant.

Kas **nepatikrinta**:

- Tikros „Supabase“, „Stripe“ ir „Resend“ paskyros. Kodas joms parašytas, bet nepaleistas.
- Tikras kreipimasis į fal.ai.
- Tikra „iPhone“ nuotrauka (HEIC testas naudoja kompiuteriu sukurtą failą).
- „TikTok“ ir „Instagram“ vidinės naršyklės.
- „Meta“ ir „TikTok“ pikseliai (išjungti).
- Portretų kokybė ir atspaudas.

Visi neišspręsti klausimai surašyti `TODO.md`.
