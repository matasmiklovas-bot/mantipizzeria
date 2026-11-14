// Small copies of the example pictures for phones, made before every build
// (npm "prebuild"), so the owner only drops the full-size files in
// public/pavyzdziai/. Existing copies newer than their source are kept.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.join(process.cwd(), 'public', 'pavyzdziai');
const JOBS = [
  [/^(\d)-portretas\.jpg$/, '-480', 480],
  [/^(\d)-nuotrauka\.jpg$/, '-360', 360],
];

let made = 0;
for (const file of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) {
  for (const [re, suffix, width] of JOBS) {
    if (!re.test(file)) continue;
    const src = path.join(DIR, file);
    const out = path.join(DIR, file.replace('.jpg', `${suffix}.jpg`));
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs) continue;
    await sharp(src).resize({ width, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    made++;
  }
}
console.log(`pavyzdziai: ${made} small copies made`);
