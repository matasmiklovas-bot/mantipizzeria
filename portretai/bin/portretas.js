#!/usr/bin/env node
// Command line entry point. All user-facing output is Lithuanian.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, SIZES, FRAMES, getSize } from '../src/config.js';
import { listStyles, loadStyle } from '../src/styles.js';

const HELP = `portretas – augintinio portreto plakato įrankis

Komandos:
  portretas kurti --nuotrauka <failas> --vardas "<vardas>" --stilius <stilius> --dydis <dydis>
      Papildomai:
        --antra-eilute "<tekstas>"        antra eilutė po vardu (data ar trumpas tekstas)
        --paruostas-portretas <failas>    jau paruoštas portretas; vaizdo modelis nekviečiamas
        --remelis <spalva>                sienos maketui: ${Object.keys(FRAMES).join(', ')} (numatyta azuolas)
        --isvestis <aplankas>             kur dėti rezultatus (numatyta isvestis/)
        --is-naujo                        generuoti iš naujo, net jei portretas jau sugeneruotas
        --modelis <id>, --raiska <1K|2K|4K>   vaizdo modelio nustatymai
        --ignoruoti-patikra               tęsti, net jei nuotrauka nepraėjo patikros

  portretas tikrinti-nuotrauka <failas>
      Patikrina, ar nuotrauka tinka: formatas, raiška, šviesumas, ryškumas.

  portretas tikrinti-spauda <spauda.pdf> --dydis <dydis>
      Išmatuoja spaudos failą: formatas, DPI, užlaidos, spalvų profilis.

  portretas apklausa <aplankas> [<aplankas> <aplankas>] [--kaina 35] [--el-pastas a@b.lt] [--isvestis apklausa.html]
      Sukuria vieną HTML puslapį „prieš ir po“ su apklausa.

  portretas stiliai
      Parodo stilius ir kur yra jų promptų failai.

Dydžiai: ${Object.keys(SIZES).join(', ')}
`;

function fail(message) {
  console.error(`\nKLAIDA: ${message}\n`);
  process.exit(1);
}

function loadEnv() {
  for (const file of [path.join(process.cwd(), '.env'), path.join(ROOT, '.env')]) {
    if (fs.existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch (err) {
        fail(`.env failo ${file} nepavyko perskaityti: ${err.message}`);
      }
      return;
    }
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'pagalba' || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === 'stiliai') {
    for (const key of listStyles()) {
      const s = loadStyle(key);
      console.log(`${key.padEnd(10)} ${s.title}: ${s.description}`);
      console.log(`${' '.repeat(10)} promptas: ${path.relative(process.cwd(), s.promptFile)}`);
    }
    return;
  }

  if (command === 'tikrinti-nuotrauka') {
    const { positionals } = parseArgs({ args: rest, allowPositionals: true, options: {} });
    if (!positionals[0]) fail('Nurodykite nuotraukos failą.');
    if (!fs.existsSync(positionals[0])) fail(`Failas nerastas: ${positionals[0]}`);
    const { checkPhoto } = await import('../src/validate.js');
    const r = await checkPhoto(positionals[0]);
    const m = r.metrics;
    if (m.width) {
      console.log(`Formatas ${m.format.toUpperCase()}, ${m.width}×${m.height} px, ${(m.bytes / 1048576).toFixed(1)} MB, šviesumas ${m.luma}, ryškumas ${m.sharpness}`);
    }
    for (const w of r.warnings) console.log(`ĮSPĖJIMAS: ${w}`);
    for (const e of r.errors) console.log(`NETINKA: ${e}`);
    console.log(r.ok ? 'Nuotrauka tinka.' : 'Nuotrauka netinka.');
    process.exit(r.ok ? 0 : 1);
  }

  if (command === 'tikrinti-spauda') {
    const { values, positionals } = parseArgs({ args: rest, allowPositionals: true, options: { dydis: { type: 'string' } } });
    if (!positionals[0]) fail('Nurodykite spaudos PDF failą.');
    if (!values.dydis) fail('Nurodykite --dydis.');
    if (!fs.existsSync(positionals[0])) fail(`Failas nerastas: ${positionals[0]}`);
    const { inspectPrintPdf } = await import('../src/pdf.js');
    const r = await inspectPrintPdf(fs.readFileSync(positionals[0]), getSize(values.dydis));
    for (const c of r.checks) console.log(`${c.ok ? 'GERAI ' : 'BLOGAI'}  ${c.name}: ${c.detail}`);
    console.log(r.ok ? '\nSpaudos failas tinkamas.' : '\nSpaudos failas NETINKAMAS.');
    process.exit(r.ok ? 0 : 1);
  }

  if (command === 'apklausa') {
    const { values, positionals } = parseArgs({
      args: rest,
      allowPositionals: true,
      options: { kaina: { type: 'string' }, 'el-pastas': { type: 'string' }, isvestis: { type: 'string' } },
    });
    if (positionals.length === 0) fail('Nurodykite bent vieną aplanką su sukurtu portretu (pvz. isvestis/reksas-akvarele-30x40).');
    if (positionals.length > 3) fail('Daugiausia 3 pavyzdžiai.');
    const price = values.kaina ? Number(values.kaina) : 35;
    if (!Number.isFinite(price) || price <= 0) fail('--kaina turi būti skaičius.');
    const { buildSurveyHtml } = await import('../src/survey.js');
    const html = await buildSurveyHtml(positionals, { price, email: values['el-pastas'] });
    const out = values.isvestis || 'apklausa.html';
    fs.writeFileSync(out, html);
    console.log(`Sukurta: ${out} (${(html.length / 1048576).toFixed(1)} MB). Atidarykite naršyklėje arba nusiųskite failą žmonėms.`);
    return;
  }

  if (command === 'kurti') {
    const { values } = parseArgs({
      args: rest,
      options: {
        nuotrauka: { type: 'string' },
        vardas: { type: 'string' },
        stilius: { type: 'string' },
        dydis: { type: 'string' },
        'antra-eilute': { type: 'string' },
        'paruostas-portretas': { type: 'string' },
        remelis: { type: 'string' },
        isvestis: { type: 'string' },
        modelis: { type: 'string' },
        raiska: { type: 'string' },
        'is-naujo': { type: 'boolean' },
        'ignoruoti-patikra': { type: 'boolean' },
      },
    });
    for (const required of ['vardas', 'stilius', 'dydis']) {
      if (!values[required]) fail(`Trūksta --${required}. Paleiskite „portretas pagalba“.`);
    }
    for (const file of [values.nuotrauka, values['paruostas-portretas']]) {
      if (file && !fs.existsSync(file)) fail(`Failas nerastas: ${file}`);
    }
    loadEnv();
    const { createPortrait, FILES } = await import('../src/pipeline.js');
    const result = await createPortrait({
      photo: values.nuotrauka,
      readyPortrait: values['paruostas-portretas'],
      name: values.vardas,
      secondLine: values['antra-eilute'],
      style: values.stilius,
      size: values.dydis,
      frame: values.remelis,
      outRoot: values.isvestis || 'isvestis',
      model: values.modelis,
      resolution: values.raiska,
      regenerate: values['is-naujo'],
      ignoreChecks: values['ignoruoti-patikra'],
      log: (m) => console.log(m),
    });

    console.log(`\nParuošta: ${result.outDir}`);
    console.log(`  ${FILES.print.padEnd(14)} spaudos failas (300 DPI, užlaidos 3 mm, sRGB)`);
    console.log(`  ${FILES.preview.padEnd(14)} peržiūra klientui su vandens ženklu`);
    console.log(`  ${FILES.clean.padEnd(14)} mažas plakatas be vandens ženklo (apklausai, socialiniams tinklams)`);
    console.log(`  ${FILES.wall.padEnd(14)} maketas ant sienos`);
    console.log(`  ${FILES.report.padEnd(14)} patikrų ataskaita`);
    console.log('\nSpaudos failo patikra:');
    for (const c of result.inspection.checks) console.log(`  ${c.ok ? 'GERAI ' : 'BLOGAI'} ${c.name}: ${c.detail}`);
    if (result.report.poster.upscaleFidelityDb) {
      console.log(`  Didinimas ${result.report.poster.upscaleFactor}×, tikslumas ${result.report.poster.upscaleFidelityDb} dB (≥ 38 dB – artefaktų nepridėta)`);
    }
    if (result.warnings.length) {
      console.log('\nĮSPĖJIMAI:');
      for (const w of result.warnings) console.log(`  – ${w}`);
    }
    console.log('\nPrieš siunčiant į spaudą pereikite KOKYBE.md sąrašą. Programa negali įvertinti, ar portretas panašus ir gražus.');
    return;
  }

  fail(`Nežinoma komanda „${command}“. Paleiskite „portretas pagalba“.`);
}

main().catch((err) => {
  if (err.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION' || err.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    fail(`${err.message}\nPaleiskite „portretas pagalba“.`);
  }
  fail(err.message);
});
