// Print file: a one-page PDF holding the poster at exactly 300 DPI, with
// TrimBox / BleedBox set and an sRGB output intent.
// TODO(savininkas): the print shop may want CMYK, a specific ICC profile, or
// TIFF instead of PDF. Until they answer, this stays sRGB PDF.

import sharp from 'sharp';
import { PDFDocument, PDFName, PDFString, PDFRawStream, PDFArray, PDFNumber, PDFDict, PDFRef } from 'pdf-lib';
import { DPI, BLEED_PX, SAFE_MM, pxToMm } from './config.js';

/**
 * @param {Buffer} posterPng poster including bleed
 * @returns {Promise<Buffer>} PDF bytes
 */
export async function buildPrintPdf(posterPng, { title = 'Portretas', size = null } = {}) {
  const PT_PER_PX = 72 / (size?.dpi ?? DPI);
  const BLEED = size?.bleedPx ?? BLEED_PX;
  const jpeg = await sharp(posterPng)
    .withIccProfile('srgb')
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4', mozjpeg: false })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = jpeg.info;
  const icc = (await sharp(jpeg.data).metadata()).icc;

  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setProducer('portretas');
  pdf.setCreator('portretas');

  const pageW = width * PT_PER_PX;
  const pageH = height * PT_PER_PX;
  const bleedPt = BLEED * PT_PER_PX;
  const page = pdf.addPage([pageW, pageH]);
  const image = await pdf.embedJpg(jpeg.data);
  page.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
  page.setMediaBox(0, 0, pageW, pageH);
  page.setBleedBox(0, 0, pageW, pageH);
  page.setTrimBox(bleedPt, bleedPt, pageW - 2 * bleedPt, pageH - 2 * bleedPt);

  if (icc) {
    const profile = pdf.context.flateStream(icc, { N: 3 });
    const intent = pdf.context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFX',
      OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
      Info: PDFString.of('sRGB IEC61966-2.1'),
      DestOutputProfile: pdf.context.register(profile),
    });
    pdf.catalog.set(PDFName.of('OutputIntents'), pdf.context.obj([pdf.context.register(intent)]));
  }

  return Buffer.from(await pdf.save({ useObjectStreams: false }));
}

/**
 * Measures a print PDF and compares it with the expected size. This is the
 * scripted check for dimensions, DPI and bleed.
 * @returns {Promise<{ ok: boolean, checks: {name:string, ok:boolean, detail:string}[], facts: object }>}
 */
export async function inspectPrintPdf(pdfBytes, size) {
  const DPI_REQ = size.dpi ?? DPI;
  const BLEED = size.bleedPx ?? BLEED_PX;
  const pdf = await PDFDocument.load(pdfBytes);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });

  add('Puslapių skaičius', pdf.getPageCount() === 1, `${pdf.getPageCount()}`);
  const page = pdf.getPage(0);
  const media = page.getMediaBox();
  const trim = page.getTrimBox();
  const bleed = page.getBleedBox();
  const hasTrim = page.node.get(PDFName.of('TrimBox')) !== undefined;
  add('TrimBox nustatytas', hasTrim, hasTrim ? 'taip' : 'ne');

  const ptToMm = (pt) => (pt / 72) * 25.4;
  const trimWmm = ptToMm(trim.width);
  const trimHmm = ptToMm(trim.height);
  add(
    'Nupjautas formatas',
    Math.abs(trimWmm - size.widthMm) <= 0.15 && Math.abs(trimHmm - size.heightMm) <= 0.15,
    `${trimWmm.toFixed(2)}×${trimHmm.toFixed(2)} mm (turi būti ${size.widthMm}×${size.heightMm} mm ±0,15)`,
  );

  const bleeds = {
    left: ptToMm(trim.x - bleed.x),
    bottom: ptToMm(trim.y - bleed.y),
    right: ptToMm(bleed.x + bleed.width - (trim.x + trim.width)),
    top: ptToMm(bleed.y + bleed.height - (trim.y + trim.height)),
  };
  const minBleed = Math.min(...Object.values(bleeds));
  const minBleedMm = BLEED === 24 ? 2 : 3; // phone-case templates use 2 mm
  add(`Užlaidos ≥ ${minBleedMm} mm iš visų pusių`, minBleed >= minBleedMm - 1e-6, Object.entries(bleeds).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ') + ' mm');

  const img = findPageImage(pdf, page);
  if (!img) {
    add('Įdėtas vaizdas', false, 'nerastas');
  } else {
    const dpiX = img.width / (media.width / 72);
    const dpiY = img.height / (media.height / 72);
    add(`Raiška ≥ ${DPI_REQ} DPI`, dpiX >= DPI_REQ - 0.01 && dpiY >= DPI_REQ - 0.01, `${dpiX.toFixed(2)}×${dpiY.toFixed(2)} DPI, vaizdas ${img.width}×${img.height} px`);
    const expectW = size.widthPx + 2 * BLEED;
    const expectH = size.heightPx + 2 * BLEED;
    add('Vaizdo matmenys pikseliais', img.width === expectW && img.height === expectH, `${img.width}×${img.height} px (turi būti ${expectW}×${expectH})`);
    add('Spalvų erdvė', img.colorSpace === 'DeviceRGB', `${img.colorSpace} (kol spaustuvė nepasakė kitaip – RGB)`);
  }

  const intents = pdf.catalog.lookupMaybe(PDFName.of('OutputIntents'), PDFArray);
  let intentName = null;
  if (intents && intents.size() > 0) {
    const first = intents.lookup(0, PDFDict);
    const id = first.lookupMaybe(PDFName.of('OutputConditionIdentifier'), PDFString);
    intentName = id ? id.decodeText() : 'nenurodytas';
  }
  add('Spalvų profilis (OutputIntent)', Boolean(intentName && intentName.includes('sRGB')), intentName || 'nėra');

  return {
    ok: checks.every((c) => c.ok),
    checks,
    facts: {
      mediaMm: [ptToMm(media.width), ptToMm(media.height)],
      trimMm: [trimWmm, trimHmm],
      bleedMm: bleeds,
      imagePx: img ? [img.width, img.height] : null,
      safeMm: size.safeMm ?? SAFE_MM,
      bleedPxMm: pxToMm(BLEED) * (300 / DPI_REQ),
    },
  };
}

function findPageImage(pdf, page) {
  const resources = page.node.Resources();
  const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
  if (!xobjects) return null;
  for (const [, ref] of xobjects.entries()) {
    const obj = ref instanceof PDFRef ? pdf.context.lookup(ref) : ref;
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.lookupMaybe(PDFName.of('Subtype'), PDFName)?.asString() !== '/Image') continue;
    const cs = dict.lookup(PDFName.of('ColorSpace'));
    return {
      width: dict.lookup(PDFName.of('Width'), PDFNumber).asNumber(),
      height: dict.lookup(PDFName.of('Height'), PDFNumber).asNumber(),
      colorSpace: cs instanceof PDFName ? cs.asString().slice(1) : 'kita',
    };
  }
  return null;
}
