// Customer and owner emails. All text is Lithuanian; every dynamic value is
// escaped. Each template returns { subject, html, text }.

import { SETTINGS, STYLE_LABELS, SIZE_LABELS, FRAME_LABELS, formatPrice, siteUrl, contactEmail } from './settings.js';
import { formatDateLong } from './deadline.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function layout({ heading, blocks, button }) {
  const contact = contactEmail();
  const body = blocks
    .filter(Boolean)
    .map((b) => (b.raw ? b.raw : `<p style="margin:0 0 16px;">${b}</p>`))
    .join('\n');
  const cta = button
    ? `<p style="margin:26px 0;"><a href="${esc(button.url)}" style="display:inline-block;background:#26221d;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:6px;font-weight:600;">${esc(button.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#6e665b;">Jei mygtukas neveikia, nukopijuokite šią nuorodą į naršyklę:<br>${esc(button.url)}</p>`
    : '';
  return `<!doctype html>
<html lang="lt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#f6f2ea;">
<div style="max-width:560px;margin:0 auto;padding:28px 20px 40px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:1.55;color:#26221d;">
<p style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:20px;">${esc(SETTINGS.brand)}</p>
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2;">${esc(heading)}</h1>
${body}
${cta}
<p style="margin:30px 0 0;padding-top:16px;border-top:1px solid #d9d1c3;font-size:13px;color:#6e665b;">${
    contact ? `Klausimai: atsakykite į šį laišką arba rašykite ${esc(contact)}.` : 'Klausimai: atsakykite į šį laišką.'
  }</p>
</div></body></html>`;
}

function summaryRows(order) {
  const rows = [
    ['Užsakymo numeris', order.code],
    ['Vardas plakate', order.name],
    order.secondLine ? ['Antra eilutė', order.secondLine] : null,
    ['Stilius', STYLE_LABELS[order.style]],
    ['Dydis', SIZE_LABELS[order.size]],
    ['Rėmelis', FRAME_LABELS[order.frame]],
    ['Pristatymas', `${order.deliveryNetwork} paštomatas, ${order.deliveryCity}, ${order.deliveryAddress}`],
    ['Sumokėta', formatPrice(order.priceCents)],
  ].filter(Boolean);
  return rows;
}

function summaryHtml(order) {
  return {
    raw:
      '<table role="presentation" style="border-collapse:collapse;width:100%;margin:6px 0 20px;">' +
      summaryRows(order)
        .map(
          ([k, v]) =>
            `<tr><td style="padding:7px 12px 7px 0;border-top:1px solid #d9d1c3;color:#6e665b;vertical-align:top;white-space:nowrap;">${esc(k)}</td>` +
            `<td style="padding:7px 0;border-top:1px solid #d9d1c3;">${esc(v)}</td></tr>`,
        )
        .join('') +
      '</table>',
  };
}

const summaryText = (order) => summaryRows(order).map(([k, v]) => `${k}: ${v}`).join('\n');
const previewUrl = (order) => `${siteUrl()}/perziura/${order.token}`;
const voucherUrl = (order) => `${siteUrl()}/kuponas/${order.token}`;
const adminUrl = (order) => `${siteUrl()}/valdymas/${order.id}`;

export const templates = {
  /** Sent once, when payment is confirmed. */
  orderReceived(order) {
    const lead = SETTINGS.production.creationDays;
    const late = order.afterChristmas;
    return {
      subject: `Užsakymą ${order.code} gavome: „${order.name}“ portretas`,
      html: layout({
        heading: 'Užsakymą gavome',
        blocks: [
          `Ačiū. Apmokėjimas gautas, pradedame kurti <strong>${esc(order.name)}</strong> portretą.`,
          summaryHtml(order),
          `<strong>Kas toliau.</strong> Per ${lead} darbo d. atsiųsime portreto peržiūrą el. paštu. Spausdiname tik tada, kai paspaudžiate „Tinka“. Vienas pataisymas nemokamas.`,
          late
            ? `<strong>Pristatymas po Kalėdų.</strong> Numatoma pristatymo data: ${esc(formatDateLong(order.estimatedDelivery))}. Jei tai dovana, atsispausdinkite dovanų kuponą ir padėkite po eglute: <a href="${esc(voucherUrl(order))}" style="color:#8a4b2a;">dovanų kuponas (PDF)</a>.`
            : `Numatoma pristatymo data: ${esc(formatDateLong(order.estimatedDelivery))}, jei peržiūrą patvirtinsite per vieną dieną.`,
          `Nuotrauką laikome privačiai ir ištrinsime praėjus ${SETTINGS.retentionDays} dienų po išsiuntimo.`,
        ],
      }),
      text:
        `Užsakymą gavome\n\nAčiū. Apmokėjimas gautas, pradedame kurti „${order.name}“ portretą.\n\n${summaryText(order)}\n\n` +
        `Kas toliau: per ${lead} darbo d. atsiųsime portreto peržiūrą el. paštu. Spausdiname tik tada, kai paspaudžiate „Tinka“. Vienas pataisymas nemokamas.\n\n` +
        (late
          ? `Pristatymas po Kalėdų. Numatoma pristatymo data: ${formatDateLong(order.estimatedDelivery)}.\nDovanų kuponas (PDF): ${voucherUrl(order)}\n`
          : `Numatoma pristatymo data: ${formatDateLong(order.estimatedDelivery)}, jei peržiūrą patvirtinsite per vieną dieną.\n`),
    };
  },

  previewReady(order, { reminder = false } = {}) {
    const url = previewUrl(order);
    const img = `${siteUrl()}/api/perziura/${order.token}/vaizdas?v=${order.portraitVersion}`;
    const revisionsLeft = Math.max(0, SETTINGS.freeRevisions - (order.revisionCount || 0));
    return {
      subject: reminder ? `Priminimas: „${order.name}“ portretas laukia jūsų patvirtinimo` : `„${order.name}“ portretas paruoštas: peržiūrėkite`,
      html: layout({
        heading: reminder ? 'Portretas vis dar laukia patvirtinimo' : 'Portretas paruoštas peržiūrai',
        blocks: [
          `<strong>${esc(order.name)}</strong> portretas paruoštas. Kol nepatvirtinsite, nespausdiname.`,
          { raw: `<p style="margin:0 0 18px;"><a href="${esc(url)}"><img src="${esc(img)}" alt="${esc(order.name)}: portreto peržiūra" width="320" style="display:block;width:320px;max-width:100%;height:auto;border:1px solid #d9d1c3;"></a></p>` },
          'Patikrinkite, ar tai jūsų augintinis ir ar vardas parašytas be klaidų. Peržiūroje yra vandens ženklas, atspaude jo nebus.',
          revisionsLeft > 0 ? 'Jei kas nors netinka, tame pačiame puslapyje parašykite, ką pataisyti. Vienas pataisymas nemokamas.' : null,
        ],
        button: { url, label: 'Peržiūrėti ir patvirtinti' },
      }),
      text:
        `„${order.name}“ portretas paruoštas. Kol nepatvirtinsite, nespausdiname.\n\nPeržiūrėti ir patvirtinti: ${url}\n\n` +
        'Patikrinkite, ar tai jūsų augintinis ir ar vardas parašytas be klaidų.\n',
    };
  },

  revisionReceived(order) {
    return {
      subject: `Pataisymo prašymą gavome (${order.code})`,
      html: layout({
        heading: 'Pataisymo prašymą gavome',
        blocks: [
          `Pataisysime <strong>${esc(order.name)}</strong> portretą ir atsiųsime naują peržiūrą el. paštu.`,
          `Jūsų pastaba: „${esc(order.revisionNotes?.at(-1)?.text || '')}“`,
        ],
      }),
      text: `Pataisymo prašymą gavome. Pataisysime „${order.name}“ portretą ir atsiųsime naują peržiūrą.\n\nJūsų pastaba: „${order.revisionNotes?.at(-1)?.text || ''}“\n`,
    };
  },

  approved(order) {
    return {
      subject: `Portretas patvirtintas (${order.code})`,
      html: layout({
        heading: 'Portretas patvirtintas',
        blocks: [
          `Ačiū. <strong>${esc(order.name)}</strong> portretą atiduodame spausdinti. Nuo šiol jo pakeisti nebegalime.`,
          'Kai išsiųsime, gausite laišką su siuntos numeriu.',
        ],
      }),
      text: `Portretas patvirtintas. „${order.name}“ portretą atiduodame spausdinti. Nuo šiol jo pakeisti nebegalime.\nKai išsiųsime, gausite laišką su siuntos numeriu.\n`,
    };
  },

  inPrint(order) {
    return {
      subject: `„${order.name}“ portretas spausdinamas (${order.code})`,
      html: layout({
        heading: 'Portretas spausdinamas',
        blocks: [`<strong>${esc(order.name)}</strong> portretas atiduotas spaustuvei. Atspausdintą įrėminsime ir išsiųsime į jūsų paštomatą.`],
      }),
      text: `„${order.name}“ portretas atiduotas spaustuvei. Atspausdintą įrėminsime ir išsiųsime į jūsų paštomatą.\n`,
    };
  },

  shipped(order) {
    return {
      subject: `Išsiųsta: „${order.name}“ portretas (${order.code})`,
      html: layout({
        heading: 'Portretas išsiųstas',
        blocks: [
          `<strong>${esc(order.name)}</strong> portretas išsiųstas į ${esc(order.deliveryNetwork)} paštomatą: ${esc(order.deliveryCity)}, ${esc(order.deliveryAddress)}.`,
          `Siuntos numeris: <strong>${esc(order.trackingNumber)}</strong>`,
          `Kai siunta pasieks paštomatą, ${esc(order.deliveryNetwork)} atsiųs jums SMS arba laišką su atsiėmimo kodu.`,
          'Jei siunta atkeliavo pažeista, nufotografuokite pakuotę ir portretą ir atsakykite į šį laišką: pagaminsime iš naujo.',
        ],
      }),
      text:
        `„${order.name}“ portretas išsiųstas į ${order.deliveryNetwork} paštomatą: ${order.deliveryCity}, ${order.deliveryAddress}.\n` +
        `Siuntos numeris: ${order.trackingNumber}\n\nJei siunta atkeliavo pažeista, nufotografuokite pakuotę ir portretą ir atsakykite į šį laišką.\n`,
    };
  },

  cancelled(order) {
    return {
      subject: `Užsakymas ${order.code} atšauktas`,
      html: layout({
        heading: 'Užsakymas atšauktas',
        blocks: [`Užsakymas ${esc(order.code)} („${esc(order.name)}“) atšauktas. Jei mokėjote, pinigus grąžinsime tuo pačiu būdu, kuriuo mokėjote.`],
      }),
      text: `Užsakymas ${order.code} („${order.name}“) atšauktas. Jei mokėjote, pinigus grąžinsime tuo pačiu būdu, kuriuo mokėjote.\n`,
    };
  },

  // --- Owner notifications ------------------------------------------------

  ownerNewOrder(order) {
    return {
      subject: `Naujas užsakymas ${order.code}: ${order.name}, ${STYLE_LABELS[order.style]}, ${SIZE_LABELS[order.size]}`,
      html: layout({
        heading: 'Naujas apmokėtas užsakymas',
        blocks: [summaryHtml(order), `Klientas: ${esc(order.customerName)}, ${esc(order.email)}, ${esc(order.phone)}`],
        button: { url: adminUrl(order), label: 'Atidaryti užsakymą' },
      }),
      text: `Naujas apmokėtas užsakymas\n\n${summaryText(order)}\nKlientas: ${order.customerName}, ${order.email}, ${order.phone}\n\n${adminUrl(order)}\n`,
    };
  },

  ownerApproved(order) {
    return {
      subject: `Patvirtinta: ${order.code} (${order.name}) – galima spausdinti`,
      html: layout({
        heading: 'Klientas patvirtino portretą',
        blocks: [`Užsakymas ${esc(order.code)}, „${esc(order.name)}“. Spaudos failą rasite užsakymo puslapyje.`],
        button: { url: adminUrl(order), label: 'Atidaryti užsakymą' },
      }),
      text: `Klientas patvirtino portretą. Užsakymas ${order.code}, „${order.name}“.\n${adminUrl(order)}\n`,
    };
  },

  ownerPaymentProblem(order, detail) {
    return {
      subject: `Mokėjimo problema: ${order.code} (${order.name})`,
      html: layout({
        heading: 'Mokėjimo problema',
        blocks: [`Užsakymas ${esc(order.code)}, „${esc(order.name)}“, ${esc(order.email)}.`, esc(detail)],
        button: { url: adminUrl(order), label: 'Atidaryti užsakymą' },
      }),
      text: `Mokėjimo problema. Užsakymas ${order.code}, „${order.name}“, ${order.email}.\n${detail}\n${adminUrl(order)}\n`,
    };
  },

  ownerRevision(order) {
    const note = order.revisionNotes?.at(-1)?.text || '';
    return {
      subject: `Prašo pataisymo: ${order.code} (${order.name})`,
      html: layout({
        heading: 'Klientas prašo pataisymo',
        blocks: [`Užsakymas ${esc(order.code)}, „${esc(order.name)}“.`, `Pastaba: „${esc(note)}“`],
        button: { url: adminUrl(order), label: 'Atidaryti užsakymą' },
      }),
      text: `Klientas prašo pataisymo. Užsakymas ${order.code}, „${order.name}“.\nPastaba: „${note}“\n${adminUrl(order)}\n`,
    };
  },
};
