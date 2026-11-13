// Business settings for the website: prices, lead times, seller details.
// This is the one file the owner edits. Anything marked TODO(savininkas) is an
// assumption that must be confirmed; launchIssues() lists what is still open.

export const SETTINGS = {
  // TODO(savininkas): working name until the brand and the .lt domain are chosen.
  brand: 'Snukutis',

  // Price in euro cents, parcel-locker delivery included (posters with a frame).
  // TODO(savininkas): working prices; confirm after the print shop, blanket and case suppliers quote.
  prices: { a4: 3500, '30x40': 4500, pledas: 5900, deklas: 2900 },

  // What the portrait can be printed on. Each product maps to one print format.
  products: ['plakatas', 'pledas', 'deklas'],
  // Models on sale as of 2026-11 (iPhone 17 family since 2025-09, Galaxy S26 since 2026-03).
  // TODO(savininkas): keep only the models your case supplier really makes.
  phoneModels: [
    'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17',
    'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro', 'iPhone 15', 'iPhone 14', 'iPhone 13',
    'Samsung Galaxy S26 Ultra', 'Samsung Galaxy S26', 'Samsung Galaxy S25', 'Samsung Galaxy S24', 'Samsung Galaxy S23',
    'Samsung Galaxy A55', 'Samsung Galaxy A54',
  ],
  pricesConfirmed: false,

  sizes: ['30x40', 'a4'],
  styles: ['akvarele', 'aliejus', 'grafika'],
  frames: ['azuolas', 'juodas', 'baltas'],

  // TODO(savininkas): which locker networks you really ship with, and at what cost.
  lockerNetworks: ['Omniva', 'LP Express', 'DPD'],
  lockerNetworksConfirmed: false,

  // Lead times in business days.
  // TODO(savininkas): printDays and deliveryDays are guesses until the print
  // shop and the courier confirm them.
  production: {
    creationDays: 1, // making the portrait and sending the preview
    revisionBufferDays: 2, // room for the customer to answer and for one revision
    printDays: 3,
    deliveryDays: 2,
    confirmed: false,
  },

  // Orders must arrive by this date to count as "before Christmas".
  christmas: { deliverBy: '2026-12-23' },

  // Shown on the site only when filled in.
  // TODO(savininkas): e.g. 'matinis 230 g/m² popierius'
  paper: null,
  // TODO(savininkas): e.g. 'medinis rėmelis su organiniu stiklu'
  frameMaterial: null,

  // TODO(savininkas): required on the legal pages before launch.
  seller: {
    name: null, // vardas, pavardė arba įmonės pavadinimas
    activityNumber: null, // individualios veiklos pažymos nr. arba įmonės kodas
    address: null,
    email: null,
    phone: null,
  },

  // Set to true only after you have read and corrected the legal pages.
  legalReviewed: false,

  // Wording chosen by the owner (2026-11-12).
  aiDisclosure: 'Portretą piešiame kompiuterinėmis programomis pagal jūsų nuotrauką. Kiekvieną portretą prieš spaudą peržiūri žmogus.',
  aiDisclosureConfirmed: true,

  // Customer photos and portrait files are deleted this many days after shipping.
  retentionDays: 30,
  // Unpaid orders and unused uploads are deleted after this many hours.
  unpaidRetentionHours: 48,

  freeRevisions: 1,
};

export const STATUSES = [
  'laukia_apmokejimo',
  'apmoketa',
  'kuriama',
  'laukia_patvirtinimo',
  'taisoma',
  'patvirtinta',
  'spaudoje',
  'issiusta',
  'atsaukta',
];

export const STATUS_LABELS = {
  laukia_apmokejimo: 'Laukia apmokėjimo',
  apmoketa: 'Apmokėta',
  kuriama: 'Kuriama',
  laukia_patvirtinimo: 'Laukia patvirtinimo',
  taisoma: 'Taisoma',
  patvirtinta: 'Patvirtinta',
  spaudoje: 'Spaudoje',
  issiusta: 'Išsiųsta',
  atsaukta: 'Atšaukta',
};

export const STYLE_LABELS = { akvarele: 'Akvarelė', aliejus: 'Aliejus', grafika: 'Grafika' };
export const PRODUCT_LABELS = { plakatas: 'Paveikslas su rėmeliu', pledas: 'Pledas', deklas: 'Telefono dėklas' };
// TODO(savininkas): materials as your suppliers state them.
export const PRODUCT_NOTES = {
  plakatas: 'Atspausdintas ir įrėmintas, paruoštas kabinti.',
  pledas: '100×150 cm, minkštas, spauda vienoje pusėje.',
  deklas: 'Spauda ant dėklo nugarėlės, pagal jūsų telefono modelį.',
};

/** Print format (key of src/config SIZES) for a product and, for posters, the chosen size. */
export function formatFor(product, size) {
  if (product === 'pledas') return 'pledas';
  if (product === 'deklas') return 'deklas';
  return size;
}
export const SIZE_LABELS = { '30x40': '30×40 cm', a4: 'A4 (21×29,7 cm)', pledas: '100×150 cm', deklas: 'pagal telefono modelį' };
export const FRAME_LABELS = { azuolas: 'Ąžuolo spalvos', juodas: 'Juodas', baltas: 'Baltas' };

/** Lowest price, for "nuo … €" on the home page. */
export function minPrice() {
  return Math.min(...Object.values(SETTINGS.prices));
}

/**
 * One line that says what the customer bought, e.g.
 * "Paveikslas 30×40 cm, ąžuolo spalvos rėmelis", "Pledas 100×150 cm", "Telefono dėklas, iPhone 15".
 * @param {{ product?: string, size: string, frame?: string|null, phoneModel?: string|null }} order
 */
export function describeProduct(order) {
  const product = order.product || 'plakatas';
  if (product === 'pledas') return 'Pledas 100×150 cm';
  if (product === 'deklas') return `Telefono dėklas, ${order.phoneModel || 'modelis nenurodytas'}`;
  const frame = order.frame ? `, ${FRAME_LABELS[order.frame].toLocaleLowerCase('lt-LT')} rėmelis` : '';
  return `Paveikslas ${SIZE_LABELS[order.size]}${frame}`;
}

export function formatPrice(cents) {
  const euros = cents / 100;
  return (Number.isInteger(euros) ? String(euros) : euros.toFixed(2).replace('.', ',')) + ' €';
}

/** Public site URL without a trailing slash. */
export function siteUrl() {
  return (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export function contactEmail() {
  return process.env.CONTACT_EMAIL || SETTINGS.seller.email || null;
}

/**
 * Everything that must be settled before real customers pay. Used by the
 * admin page and by scripts/paleidimo-patikra.mjs.
 * @returns {{ blocking: boolean, text: string }[]}
 */
export function launchIssues(env = process.env) {
  const issues = [];
  const add = (blocking, text) => issues.push({ blocking, text });
  const s = SETTINGS;

  if (!s.seller.name || !s.seller.activityNumber || !s.seller.address || !s.seller.email) {
    add(true, 'Neįrašyti pardavėjo rekvizitai (server/settings.js → seller). Be jų pirkimo taisyklės negalioja.');
  }
  if (!s.legalReviewed) add(true, 'Teisiniai puslapiai neperžiūrėti (server/settings.js → legalReviewed).');
  if (!s.production.confirmed) add(true, 'Spaudos ir pristatymo trukmė nepatvirtinta (production.confirmed). Nuo jos priklauso Kalėdų terminas.');
  if (!s.pricesConfirmed) add(true, 'Kainos nepatvirtintos (pricesConfirmed).');
  if (!s.lockerNetworksConfirmed) add(true, 'Paštomatų tinklai nepatvirtinti (lockerNetworksConfirmed).');
  if (!s.aiDisclosureConfirmed) add(false, 'Formuluotė apie DI nepatvirtinta (aiDisclosureConfirmed).');
  if (!s.paper) add(false, 'Neįrašytas popieriaus tipas (paper): svetainėje jo nerodome.');
  if (!s.frameMaterial) add(false, 'Neįrašyta rėmelio medžiaga (frameMaterial): svetainėje jos nerodome.');

  const need = (name, why) => {
    if (!env[name]) add(true, `Nenustatytas ${name}: ${why}`);
  };
  need('SITE_URL', 'be jo nuorodos laiškuose rodys į localhost.');
  need('SESSION_SECRET', 'be jo neveikia prisijungimas prie valdymo puslapio.');
  need('ADMIN_PASSWORD', 'be jo neveikia prisijungimas prie valdymo puslapio.');
  need('SUPABASE_URL', 'be jo užsakymai nesaugomi.');
  need('SUPABASE_SERVICE_ROLE_KEY', 'be jo užsakymai nesaugomi.');
  need('STRIPE_SECRET_KEY', 'be jo neveikia apmokėjimas.');
  need('STRIPE_WEBHOOK_SECRET', 'be jo apmokėti užsakymai nepažymimi kaip apmokėti.');
  need('RESEND_API_KEY', 'be jo nesiunčiami laiškai.');
  need('EMAIL_FROM', 'be jo nesiunčiami laiškai.');
  need('OWNER_EMAIL', 'be jo negausite pranešimų apie užsakymus.');
  if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    add(true, 'STRIPE_SECRET_KEY yra bandomasis (sk_test_…): tikri pinigai nepriimami.');
  }
  if (env.ALLOW_TEST_HOOKS === '1') add(true, 'ALLOW_TEST_HOOKS=1: bandomieji įrankiai įjungti. Tikroje svetainėje ištrinkite.');
  return issues;
}
