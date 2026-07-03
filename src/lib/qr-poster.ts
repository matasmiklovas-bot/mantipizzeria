import type jsPDF from "jspdf";

const POSTER_W = 600;
const POSTER_H = 800;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function renderPosterCanvas(
  qrSrc: string,
  label: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d")!;

  // fonas
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // auksinis rėmelis
  ctx.strokeStyle = "#c9a962";
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, POSTER_W - 40, POSTER_H - 40);

  // logotipas
  try {
    const logo = await loadImage("/brand/logo.png");
    const logoW = 220;
    const logoH = (logo.height / logo.width) * logoW;
    ctx.filter = "brightness(0) invert(1)";
    ctx.drawImage(logo, (POSTER_W - logoW) / 2, 70, logoW, logoH);
    ctx.filter = "none";
  } catch {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("MANTÌ", POSTER_W / 2, 100);
    ctx.fillText("PIZZERIA", POSTER_W / 2, 140);
  }

  // QR dėžutė
  const qrBoxSize = 340;
  const qrBoxX = (POSTER_W - qrBoxSize) / 2;
  const qrBoxY = 200;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
  ctx.fillStyle = "#faf8f5";
  ctx.fill();

  const qr = await loadImage(qrSrc);
  const qrPad = 28;
  const qrInner = qrBoxSize - qrPad * 2;
  ctx.drawImage(qr, qrBoxX + qrPad, qrBoxY + qrPad, qrInner, qrInner);

  // staliuko etiketė
  ctx.font = "600 32px system-ui, sans-serif";
  const labelW = ctx.measureText(label).width + 80;
  const labelH = 56;
  const labelX = (POSTER_W - labelW) / 2;
  const labelY = POSTER_H - 120;
  roundRect(ctx, labelX, labelY, labelW, labelH, labelH / 2);
  ctx.fillStyle = "#8b2635";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, POSTER_W / 2, labelY + labelH / 2);

  return canvas;
}

export async function downloadPosterPng(qrSrc: string, label: string, filename: string) {
  const canvas = await renderPosterCanvas(qrSrc, label);
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function posterPrintHtml(
  items: { qrSrc: string; label: string }[]
): string {
  const cards = items
    .map(
      ({ qrSrc, label }) => `
    <div class="page">
      <div class="card">
        <img class="logo" src="/brand/logo.png" alt="Mantì Pizzeria" />
        <div class="qr-box">
          <img src="${qrSrc}" alt="QR" />
        </div>
        <div class="label">${label}</div>
      </div>
    </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><title>Manti QR</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #eee; }
  .page {
    width: 210mm; height: 297mm;
    display: flex; align-items: center; justify-content: center;
    page-break-after: always;
    background: #eee;
  }
  .page:last-child { page-break-after: auto; }
  .card {
    width: 105mm; height: 148mm;
    background: #111;
    border: 2px solid #c9a962;
    border-radius: 2px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: 10mm 8mm;
  }
  .logo {
    height: 18mm; width: auto;
    filter: brightness(0) invert(1);
  }
  .qr-box {
    background: #faf8f5;
    border-radius: 5mm;
    padding: 5mm;
  }
  .qr-box img { width: 55mm; height: 55mm; display: block; }
  .label {
    background: #8b2635;
    color: #fff;
    font: 600 16px/1 system-ui, sans-serif;
    padding: 4mm 10mm;
    border-radius: 999px;
    white-space: nowrap;
  }
</style></head><body>${cards}</body></html>`;
}

export async function addPosterToPdf(
  pdf: jsPDF,
  qrSrc: string,
  label: string,
  isFirst: boolean
) {
  const canvas = await renderPosterCanvas(qrSrc, label);
  const imgData = canvas.toDataURL("image/png");
  if (!isFirst) pdf.addPage();

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const cardW = 105;
  const cardH = 148;
  const x = (pageW - cardW) / 2;
  const y = (pageH - cardH) / 2;
  pdf.addImage(imgData, "PNG", x, y, cardW, cardH);
}
