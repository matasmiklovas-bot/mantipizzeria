import type { Metadata } from 'next';
import { DraftNotice, SellerDetails } from '@/components/Legal';
import { SETTINGS } from '@/server/settings.js';

export const metadata: Metadata = { title: 'Privatumo politika' };

export default function PrivacyPage() {
  return (
    <div className="wrap prose">
      <h1>Privatumo politika</h1>
      <DraftNotice />

      <h2>Kas tvarko duomenis</h2>
      <SellerDetails />

      <h2>Kokius duomenis renkame ir kam</h2>
      <ul>
        <li>
          <strong>Augintinio nuotrauka ir vardas.</strong> Portretui sukurti. Jei nuotraukoje yra žmonių, jie į portretą nepatenka.
        </li>
        <li>
          <strong>Vardas, pavardė, el. paštas, telefonas.</strong> Užsakymui patvirtinti, peržiūrai atsiųsti, siuntai įteikti.
        </li>
        <li>
          <strong>Paštomato tinklas, miestas ir adresas.</strong> Pristatymui.
        </li>
        <li>
          <strong>Užsakymo duomenys</strong> (stilius, dydis, kaina, apmokėjimo data, jūsų pastabos dėl pataisymo). Užsakymui įvykdyti ir apskaitai.
        </li>
      </ul>
      <p>Mokėjimo kortelės duomenų negauname ir nesaugome: juos tvarko mokėjimų paslaugos teikėjas.</p>
      <p>Duomenis tvarkome tam, kad įvykdytume sutartį su jumis, ir tiek, kiek reikalauja apskaitos teisės aktai. Naujienlaiškių nesiunčiame.</p>

      <h2>Kiek laikome</h2>
      <ul>
        <li>
          <strong>Nuotrauka ir portreto failai:</strong> ištrinami praėjus {SETTINGS.retentionDays} dienų po išsiuntimo.
        </li>
        <li>
          <strong>Įkelta, bet neapmokėta nuotrauka:</strong> ištrinama per {SETTINGS.unpaidRetentionHours} valandas.
        </li>
        <li>
          <strong>Užsakymo įrašas</strong> (vardas, kontaktai, kas užsakyta, kaina): laikomas tiek, kiek reikalauja apskaitos teisės aktai.{' '}
          <span className="todo">TODO(savininkas): įrašyti tikslų terminą pagal jūsų veiklos formą.</span>
        </li>
      </ul>
      <p>Nuotraukos laikomos privačioje saugykloje. Viešos nuorodos į jas nėra.</p>

      <h2>Kam perduodame</h2>
      <p>Tik paslaugų teikėjams, be kurių užsakymo įvykdyti negalime:</p>
      <ul>
        <li>svetainės talpinimo ir duomenų saugojimo paslaugų teikėjams;</li>
        <li>mokėjimų paslaugos teikėjui;</li>
        <li>el. laiškų siuntimo paslaugos teikėjui;</li>
        <li>vaizdo apdorojimo (dirbtinio intelekto) paslaugos teikėjui: jam perduodama tik augintinio nuotrauka, be jūsų vardo ir kontaktų;</li>
        <li>spaustuvei: tik paruoštas portreto failas;</li>
        <li>paštomatų tinklui: jūsų vardas, telefonas ir pasirinktas paštomatas.</li>
      </ul>
      <p>
        Dalis šių teikėjų gali tvarkyti duomenis už Europos ekonominės erdvės ribų.{' '}
        <span className="todo">TODO(savininkas): įrašyti konkrečius teikėjus, jų šalis ir duomenų perdavimo pagrindą (pvz., standartines sutarčių sąlygas).</span>
      </p>

      <h2>Slapukai ir statistika</h2>
      <p>
        Svetainė lankytojams slapukų nenaudoja. Lankomumą skaičiuojame be slapukų ir be jūsų identifikavimo: įrašome tik atidarytą puslapį, svetainę, iš kurios atėjote, ir
        reklamos šaltinio žymą. IP adreso nesaugome.
      </p>
      <p>
        Reklamos slapukai („Meta“, „TikTok“) naudojami tik tada, jei svetainėje pasirodžiusioje juostoje paspaudžiate „Sutinku“. Nesutikus svetainė veikia taip pat.
      </p>

      <h2>Jūsų teisės</h2>
      <p>
        Galite paprašyti parodyti, ištaisyti arba ištrinti savo duomenis, apriboti jų tvarkymą ar gauti jų kopiją. Parašykite aukščiau nurodytu el. paštu: atsakysime per 30 dienų.
        Nuotrauką ištrinsime anksčiau nei numatyta, jei paprašysite. Jei manote, kad duomenis tvarkome netinkamai, galite kreiptis į Valstybinę duomenų apsaugos inspekciją.
      </p>
    </div>
  );
}
