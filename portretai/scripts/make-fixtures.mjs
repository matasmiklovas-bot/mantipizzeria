// Regenerates the synthetic test images. They are drawings, not real pets:
// they exercise the code paths, they say nothing about portrait quality.
// The HEIC fixture is produced separately (see the bottom of this file).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');
fs.mkdirSync(dir, { recursive: true });

function drawing(w, h, bg, fur, dark, textured) {
  const s = w / 1792;
  const fine = textured
    ? `<filter id="fur" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.25"/><feComposite in2="SourceGraphic" operator="in"/></filter>`
    : '';
  const shapes =
    `<ellipse cx="896" cy="1650" rx="520" ry="420" fill="${fur}" opacity="0.8"/>` +
    `<polygon points="520,520 640,180 820,560" fill="${dark}"/><polygon points="1270,520 1150,180 970,560" fill="${dark}"/>` +
    `<ellipse cx="896" cy="900" rx="470" ry="520" fill="${fur}"/><ellipse cx="896" cy="1120" rx="200" ry="170" fill="#f3ead9"/>` +
    `<circle cx="720" cy="820" r="62" fill="#3a2a12"/><circle cx="1072" cy="820" r="62" fill="#3a2a12"/>` +
    `<circle cx="738" cy="800" r="16" fill="#fff"/><circle cx="1090" cy="800" r="16" fill="#fff"/>` +
    `<ellipse cx="896" cy="1060" rx="70" ry="50" fill="#221a14"/>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1792 2240">` +
      `<defs><filter id="b"><feTurbulence baseFrequency="0.02" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="60"/></filter>${fine}</defs>` +
      `<rect width="1792" height="2240" fill="${bg}"/><g filter="url(#b)">${shapes}</g>` +
      (textured ? `<g filter="url(#fur)"><g filter="url(#b)">${shapes}</g></g>` : '') +
      `</svg>`,
  );
}

const photo = await sharp(drawing(1600, 2000, '#7d8c6a', '#b9824a', '#6a4526', true)).jpeg({ quality: 88 }).toBuffer();
fs.writeFileSync(path.join(dir, 'sunelis.jpg'), photo);
fs.writeFileSync(path.join(dir, 'sunelis.png'), await sharp(photo).resize({ width: 1000 }).png().toBuffer());
fs.writeFileSync(path.join(dir, 'neryski.jpg'), await sharp(photo).blur(9).jpeg({ quality: 85 }).toBuffer());
fs.writeFileSync(path.join(dir, 'tamsi.jpg'), await sharp(photo).linear(0.12, 0).jpeg({ quality: 85 }).toBuffer());
fs.writeFileSync(path.join(dir, 'maza.jpg'), await sharp(photo).resize({ width: 480 }).jpeg({ quality: 85 }).toBuffer());
// EXIF orientation 6: stored landscape, must be shown portrait.
fs.writeFileSync(path.join(dir, 'pasukta.jpg'), await sharp(photo).rotate(-90).withMetadata({ orientation: 6 }).jpeg({ quality: 85 }).toBuffer());
fs.writeFileSync(path.join(dir, 'ne-paveikslelis.jpg'), 'tai ne paveikslelis');
fs.writeFileSync(path.join(dir, 'portretas.png'), await sharp(drawing(1792, 2240, '#fdfcf9', '#b9824a', '#7a4f28', false)).png({ compressionLevel: 9 }).toBuffer());
fs.writeFileSync(path.join(dir, 'portretas-kvadratas.png'), await sharp(drawing(1792, 2240, '#1e1712', '#c08a4f', '#6b4423', false)).resize({ width: 1024, height: 1024, fit: 'cover' }).png({ compressionLevel: 9 }).toBuffer());
console.log('Fixtures written to', dir);

// sunelis.heic was made once from sunelis.jpg with:
//   pip install pillow-heif
//   python3 -c "from PIL import Image; import pillow_heif; pillow_heif.register_heif_opener(); Image.open('sunelis.jpg').save('sunelis.heic', quality=80)"
// It is an HEVC-encoded HEIC like an iPhone produces, but it did not come
// from an iPhone.
