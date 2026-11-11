# Portretai: 0 etapas (kokybės patikrinimas)

Komandinės eilutės įrankis, kuris iš augintinio nuotraukos padaro spaudai paruoštą plakatą su vardu. Svetainės čia dar nėra: ji kuriama tik tada, kai žmonės, pamatę tris tikrus pavyzdžius, pasako, kad už tai mokėtų.

Šis aplankas yra atskiras nuo picerijos svetainės kodo ir jo neliečia.

## Ką įrankis daro

1. Patikrina nuotrauką: formatą (JPG, PNG, HEIC), raišką, ar ne per tamsi, ar ne išplaukusi.
2. Sukuria stilizuotą portretą per vaizdo modelį arba paima tavo paties paruoštą portretą.
3. Padidina iki spaudos raiškos (300 DPI).
4. Sumaketuoja plakatą: portretas, vardas, pasirinktinai antra eilutė. Vardą rašo kodas tikru šriftu, ne vaizdo modelis.
5. Išveda spaudos PDF, peržiūrą klientui su vandens ženklu ir maketą ant sienos.
6. Išmatuoja spaudos failą ir neleidžia jo išsaugoti, jei matmenys, DPI ar užlaidos netinka.

Ko įrankis nedaro: nevertina, ar portretas panašus ir gražus. Tam yra `KOKYBE.md`.

## Paleidimas „Windows“ kompiuteryje

„iPad“ komandinės eilutės programų paleisti negali. Reikia „Windows“ kompiuterio.

1. Įdiek „Node.js“ 22 ar naujesnę versiją iš nodejs.org (mygtukas „LTS“). Diegimo metu visur spausk „Next“.
2. Parsisiųsk saugyklą: „GitHub“ puslapyje „Code“ → „Download ZIP“, išpakuok.
3. Atidaryk „PowerShell“ aplanke `portretai` (aplanke laikyk „Shift“, spausk dešinį pelės klavišą → „Open PowerShell window here“).
4. Vieną kartą įdiek priklausomybes:

   ```
   npm install
   ```

5. Patikrink, ar veikia:

   ```
   npm test
   ```

   Pabaigoje turi būti `# fail 0`.

## Komandos

Visos komandos leidžiamos aplanke `portretai`.

### Sukurti plakatą

```
node bin/portretas.js kurti --nuotrauka pavyzdziai/reksas.jpg --vardas "Reksas" --stilius akvarele --dydis 30x40
```

Papildomi nustatymai:

| Nustatymas | Ką daro |
|---|---|
| `--antra-eilute "2014 – 2026"` | Antra eilutė po vardu |
| `--paruostas-portretas kelias.png` | Naudoja tavo paruoštą portretą, vaizdo modelio nekviečia |
| `--remelis juodas` | Rėmelio spalva sienos makete: `juodas`, `baltas`, `azuolas` |
| `--dydis a4` | Dydžiai: `30x40`, `a4` |
| `--raiska 4K` | Modelio raiška: `1K`, `2K`, `4K` |
| `--is-naujo` | Generuoja iš naujo, nors portretas jau sugeneruotas |
| `--ignoruoti-patikra` | Tęsia, nors nuotrauka nepraėjo patikros |

Rezultatas atsiranda aplanke `isvestis/<vardas>-<stilius>-<dydis>/`:

| Failas | Kam |
|---|---|
| `spauda.pdf` | Spaustuvei: 300 DPI, 3 mm užlaidos, sRGB |
| `perziura.jpg` | Klientui: su vandens ženklu |
| `plakatas.jpg` | Tau: mažas plakatas be vandens ženklo |
| `siena.jpg` | Maketas ant sienos rėmelyje |
| `originalas.jpg` | Sumažinta kliento nuotrauka palyginimui |
| `portretas-modelio.png` | Tai, ką grąžino vaizdo modelis (kad nereikėtų mokėti antrą kartą) |
| `ataskaita.json` | Visų patikrų rezultatai |

Aplankas `isvestis/` į „git“ nepatenka, nes jame bus klientų nuotraukos.

### Be API rakto

Portretą pasidaryk bet kuriuo įrankiu, išsaugok kaip PNG ar JPG (geriausia 4:5 proporcijos, bent 2000 px pločio) ir paduok programai:

```
node bin/portretas.js kurti --nuotrauka pavyzdziai/reksas.jpg --paruostas-portretas mano-portretas.png --vardas "Reksas" --stilius akvarele --dydis 30x40
```

### Patikrinti nuotrauką

```
node bin/portretas.js tikrinti-nuotrauka pavyzdziai/reksas.jpg
```

### Išmatuoti spaudos failą

```
node bin/portretas.js tikrinti-spauda isvestis/reksas-akvarele-30x40/spauda.pdf --dydis 30x40
```

### Sukurti apklausos puslapį

```
node bin/portretas.js apklausa isvestis/reksas-akvarele-30x40 isvestis/murka-aliejus-30x40 isvestis/bo-grafika-30x40 --kaina 35
```

Sukuria vieną failą `apklausa.html`. Jame nėra jokių išorinių nuorodų: paveikslėliai įdėti į patį failą. Nusiųsk jį žmonėms arba atidaryk savo telefone ir parodyk. Atsakęs žmogus gauna tekstą, kurį atsiunčia tau žinute.

### Stiliai

```
node bin/portretas.js stiliai
```

| Stilius | Kaip atrodo |
|---|---|
| `akvarele` | Laisva akvarelė ant balto popieriaus, vardas kursyvu |
| `aliejus` | Klasikinis aliejinis portretas tamsiame fone su šviesia parašte |
| `grafika` | Plokščių spalvų plakatas, vardas didžiosiomis |

Kiekvieno stiliaus promptas yra atskirame tekstiniame faile `stiliai/<stilius>.txt`. Jį gali taisyti „Notepad“ programa, kodo liesti nereikia. Maketo nustatymai (šriftas, dydis) yra `stiliai/<stilius>.json`.

## API raktas

1. Nukopijuok `.env.example` į `.env`.
2. Įrašyk `FAL_KEY=` reikšmę.
3. `.env` failas į „git“ nepatenka. Niekam jo nesiųsk.

## Kas patikrinta ir kas ne

Patikrinta automatiniais testais (`npm test`):

- HEIC, JPG ir PNG nuskaitymas, pasuktos nuotraukos, per mažos, per tamsios, išplaukusios nuotraukos atmetimas.
- Visi šriftai turi visas lietuviškas raides; „Žąsiukė Ąžuolė“ su visais ženklais atsiranda spaudos vaizde.
- Vardas ir antra eilutė telpa saugioje zonoje visuose stiliuose ir dydžiuose, net 30 ženklų vardas.
- Spaudos PDF: nupjautas formatas, 300 DPI, užlaidos ≥ 3 mm, sRGB profilis.
- Peržiūroje yra vandens ženklas.
- Užklausa vaizdo modeliui sudaroma teisingai, rezultatas išsaugomas ir antrą kartą nemokamas.

Nepatikrinta:

- **Tikras kreipimasis į fal.ai.** Kodas parašytas pagal dokumentaciją, bet nė karto nepaleistas su tikru raktu.
- **Tikra „iPhone“ nuotrauka.** HEIC testas naudoja kompiuteriu sukurtą HEIC failą.
- **Nuotraukos patikros slenksčiai.** Jie nustatyti pagal dirbtinius paveikslėlius, ne pagal tikras augintinių nuotraukas.
- **Portretų kokybė.** Visi bandomieji paveikslėliai yra piešti kodu. Jie nieko nesako apie tai, kaip atrodys tikras portretas.
- **Atspaudas.** Spalvos ir ryškumas ant popieriaus paaiškės tik atspausdinus.

## Jei kas nors neveikia

| Kas matosi | Ką daryti |
|---|---|
| `Nėra FAL_KEY` | Sukurk `.env` failą arba naudok `--paruostas-portretas` |
| `fal.ai klaida … HTTP 401` arba `403` | Raktas neteisingas arba paskyroje baigėsi kreditai |
| `fal.ai klaida … HTTP 422` | Modelio parametrai pasikeitė; parašyk man |
| `Nuotrauka netinka` | Perskaityk priežastį; jei nesutinki, pridėk `--ignoruoti-patikra` |
| `Šių ženklų šriftas neturi` | Varde yra jaustukas ar ne lotyniška raidė; pašalink |
| `Spaudos failas nepraėjo patikros` | Failas neišsaugotas; tai programos klaida, parašyk man |
| `npm` arba `node` nerastas | Neįdiegtas „Node.js“ arba neperkrautas „PowerShell“ langas |

Visi neišspręsti klausimai surašyti `TODO.md`.
