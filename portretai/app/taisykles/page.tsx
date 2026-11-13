import type { Metadata } from 'next';
import Link from 'next/link';
import { DraftNotice, SellerDetails } from '@/components/Legal';
import { SETTINGS, SIZE_LABELS, formatPrice } from '@/server/settings.js';

export const metadata: Metadata = { title: 'Pirkimo taisyklės' };

export default function TermsPage() {
  const p = SETTINGS.production;
  return (
    <div className="wrap prose">
      <h1>Pirkimo taisyklės</h1>
      <DraftNotice />

      <h2>1. Pardavėjas</h2>
      <SellerDetails />

      <h2>2. Kas parduodama</h2>
      <p>
        Augintinio portretas, sukurtas pagal pirkėjo įkeltą nuotrauką, su pirkėjo nurodytu vardu, atspausdintas pirkėjo pasirinktame gaminyje: ant popieriaus ir įrėmintas,
        ant pledo arba ant telefono dėklo. Kiekvienas gaminys gaminamas tik tam užsakymui; sandėlyje paruoštų prekių nėra.
      </p>
      <p>{SETTINGS.aiDisclosure}</p>

      <h2>3. Kaina</h2>
      <ul>
        {SETTINGS.sizes.map((s: string) => (
          <li key={s}>
            Paveikslas {SIZE_LABELS[s as keyof typeof SIZE_LABELS]} su rėmeliu: {formatPrice(SETTINGS.prices[s as keyof typeof SETTINGS.prices])}
          </li>
        ))}
        <li>Pledas {SIZE_LABELS.pledas}: {formatPrice(SETTINGS.prices.pledas)}</li>
        <li>Telefono dėklas: {formatPrice(SETTINGS.prices.deklas)}</li>
      </ul>
      <p>Į kainą įeina portreto sukūrimas, spauda, paveikslo rėmelis ir pristatymas į paštomatą Lietuvoje. Kaina, rodoma apmokėjimo puslapyje, yra galutinė.</p>

      <h2>4. Užsakymas ir apmokėjimas</h2>
      <p>
        Užsakymas laikomas pateiktu, kai pirkėjas įkelia nuotrauką, nurodo vardą, pasirenka gaminį, stilių (paveikslui ir dydį bei rėmelio spalvą, dėklui telefono modelį) ir paštomatą, sutinka su šiomis taisyklėmis ir apmoka.
        Gaminti pradedame tik gavę apmokėjimą. Apmokėjimą apdoroja mokėjimų paslaugos teikėjas; kortelės duomenų pardavėjas nemato ir nesaugo.
      </p>

      <h2>5. Peržiūra ir patvirtinimas</h2>
      <p>
        Per {p.creationDays} darbo d. nuo apmokėjimo el. paštu išsiunčiame portreto peržiūrą. Pirkėjas ją patvirtina arba vieną kartą nemokamai paprašo pataisymo, aprašydamas, ką
        pakeisti. Į spaudą atiduodame tik pirkėjo patvirtintą portretą. Patvirtinus portreto pakeisti nebegalima.
      </p>
      <p>
        Jei pirkėjas neatsako į peržiūros laišką, užsakymas laukia: be patvirtinimo nespausdiname. Tokiu atveju pristatymo terminas pailgėja tiek, kiek laukėme atsakymo.
      </p>

      <h2>6. Pristatymas</h2>
      <p>
        Pristatome į pirkėjo nurodytą paštomatą Lietuvoje. Įprastas terminas yra {p.creationDays + p.revisionBufferDays + p.printDays + p.deliveryDays} darbo dienos nuo apmokėjimo, jei
        peržiūra patvirtinama per vieną dieną. Tiksli numatoma data rodoma užsakant ir patvirtinimo laiške. Išsiuntę atsiunčiame siuntos numerį.
      </p>

      <h2>7. Teisė atsisakyti sutarties</h2>
      <p>
        Portretas gaminamas pagal pirkėjo asmeninį užsakymą (jo nuotrauką ir nurodytą vardą). Tokioms prekėms 14 dienų teisė atsisakyti nuotolinės sutarties paprastai netaikoma.
        Tai nekeičia pirkėjo teisių, kai prekė yra netinkamos kokybės: žr. <Link href="/grazinimas">Grąžinimas</Link>.
      </p>
      <p>
        <span className="todo">TODO(savininkas): teisininkas turi patvirtinti šio punkto formuluotę ir nuorodą į konkretų teisės akto straipsnį.</span>
      </p>

      <h2>8. Nuotraukos ir autorių teisės</h2>
      <p>
        Įkeldamas nuotrauką pirkėjas patvirtina, kad turi teisę ją naudoti. Nuotrauką naudojame tik šiam užsakymui įvykdyti. Viešai portreto nerodome, nebent pirkėjas atskirai
        sutinka.
      </p>

      <h2>9. Skundai</h2>
      <p>
        Pirmiausia parašykite pardavėjui aukščiau nurodytu el. paštu: atsakysime per 3 darbo dienas. Jei nepavyksta susitarti, vartotojas gali kreiptis į Valstybinę vartotojų
        teisių apsaugos tarnybą.
      </p>

      <h2>10. Asmens duomenys</h2>
      <p>
        Kaip tvarkome duomenis, aprašyta <Link href="/privatumas">privatumo politikoje</Link>.
      </p>
    </div>
  );
}
