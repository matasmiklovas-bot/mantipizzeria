# Kokybės patikra prieš kiekvieną spaudą

Programa patikrina tik tai, ką galima išmatuoti: failo formatą, DPI, užlaidas, ar vardas telpa. Ar portretas panašus ir ar jis gražus, sprendi tu. Jei bent vienas punktas nepažymėtas, į spaudą nesiunčiama.

Svetainėje: užsakymo puslapyje atsidaryk „Kliento nuotrauka“ ir maketą. Komandinėje eilutėje: atsidaryk greta `originalas.jpg` ir `plakatas.jpg`.

1–4 skyrius pereik prieš siųsdamas peržiūrą klientui. 5 skyrių pereik, kai klientas patvirtino ir svetainė išdavė spaudos failą.

## 1. Ar tai tas pats gyvūnas

- [ ] Dėmės ir kailio raštas yra tose pačiose vietose kaip nuotraukoje (ne veidrodžiu, ne „maždaug“).
- [ ] Akių spalva ta pati. Jei akys skirtingų spalvų, jos skirtingos ir portrete.
- [ ] Ausų forma ir padėtis tokia pati (stačios, nulinkusios, viena nulinkusi).
- [ ] Snukio ilgis ir plotis atitinka: gyvūnas neatrodo jaunesnis, storesnis ar kitos veislės.
- [ ] Nosies spalva ir ypatingos žymės (randas, įplėšta ausis, žila barzda) išlikusios.
- [ ] Parodžius portretą be nuotraukos, šeimininkas pasakytų „čia mano“, o ne „panašus šuo“.

## 2. Ar nėra DI klaidų

- [ ] Dvi akys, vienodo dydžio, žiūri ta pačia kryptimi, vyzdžiai apvalūs (katės – vienodos formos).
- [ ] Ūsai auga iš snukio, ne iš skruosto ar oro; jų ne per daug.
- [ ] Kailis nėra „ištirpęs“: nėra vietų, kur kailis virsta dėme, plastiku ar kito gyvūno kailiu.
- [ ] Nėra papildomų ausų, letenų, pirštų, antros nosies, dvigubų dantų.
- [ ] Antkaklis, jei yra, yra vientisas ir be „raidžių“.
- [ ] Fone ir kampuose nėra atsitiktinių raidžių, parašo, vandens ženklo, rėmelio.
- [ ] Portreto apačia švariai pereina į foną: nėra nukirstos krūtinės ar kieto krašto ties vardu.

## 3. Akys

- [ ] Akys yra ryškiausia portreto vieta.
- [ ] Kiekvienoje akyje yra šviesos atspindys.
- [ ] Žvilgsnis gyvas, ne stiklinis ir ne „žmogiškas“.

## 4. Vardas ir tekstas

- [ ] Vardas raidė po raidės sutampa su užsakymu, įskaitant ą č ę ė į š ų ū ž.
- [ ] Didžiosios ir mažosios raidės tokios, kokių prašė klientas (stiliuose „Aliejus“ ir „Grafika“ vardas visada didžiosiomis).
- [ ] Antra eilutė (data, tekstas) be klaidų.
- [ ] Vardas nesiliečia su portretu ir nėra per arti krašto.

## 5. Spaudos failas

- [ ] Užsakymo puslapyje prie maketo nėra geltono įspėjimo „padidintas daugiau nei 2,5 karto“. Jei yra, generuok iš naujo didesne raiška (`--raiska 4K`). Šį punktą patikrink dar prieš siųsdamas peržiūrą.
- [ ] Spaudos failas parsisiųstas iš užsakymo puslapio po kliento patvirtinimo (svetainė neišduoda failo, kuris nepraėjo matmenų patikros).
- [ ] Padidinus `spauda.pdf` iki 100 %, akys ir kailis ties akimis nėra išplaukę ar „laiptuoti“.

## 6. Atspaudas (tikrinama gavus iš spaustuvės)

- [ ] Iš 30 cm atstumo vaizdas neišplaukęs, nesimato pikselių.
- [ ] Spalvos nenukrypusios: balta yra balta, tamsios vietos nėra vientisa juoda dėmė.
- [ ] Nupjauta tiesiai, vardas nenukirstas, baltų kraštų nėra.
- [ ] Įdėjus į rėmelį, rėmelio kraštas neuždengia vardo.
- [ ] Popieriuje nėra įbrėžimų, lenkimo žymių, pirštų atspaudų.

## Jei kas nors nepraeina

1. Panašumas ar DI klaidos: generuok iš naujo (`--is-naujo`). Tas pats promptas duoda skirtingus rezultatus.
2. Tris kartus iš eilės blogai: pataisyk promptą `stiliai/<stilius>.txt` arba paprašyk kliento kitos nuotraukos.
3. Vis tiek blogai: pasidaryk portretą kitu įrankiu ir paduok su `--paruostas-portretas`.
4. Negalima padaryti gerai: grąžink pinigus. Blogas portretas kainuoja daugiau nei vienas prarastas užsakymas.
