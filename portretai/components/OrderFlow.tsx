'use client';

// The single order path: photo → name → product, style (size, frame or phone
// model) → delivery and
// payment. State is kept in sessionStorage so a cancelled payment or an
// accidental reload does not lose the uploaded photo.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PosterPreview from './PosterPreview';
import { track } from './Beacon';

export type FlowConfig = {
  styles: { key: string; title: string; description: string }[];
  sizes: { key: string; label: string; price: string }[];
  products: {
    key: string;
    label: string;
    note: string;
    price: string;
    total: string;
  }[];
  phoneModels: string[];
  frames: { key: string; label: string; color: string }[];
  networks: string[];
  nameMax: number;
  secondMax: number;
  deliveryNote: string;
  aiDisclosure: string;
  previewDays: number;
};

type Photo = {
  photoId: string;
  thumb: string;
  preview?: string;
  warnings: string[];
};
type Fields = {
  name: string;
  secondLine: string;
  style: string;
  product: string;
  size: string;
  frame: string;
  phoneModel: string;
  customerName: string;
  email: string;
  phone: string;
  deliveryNetwork: string;
  deliveryCity: string;
  deliveryAddress: string;
  acceptTerms: boolean;
};

const STORE_KEY = 'uzsakymas-v1';
const MAX_BYTES = 15 * 1024 * 1024;
const STEP_TITLES = ['Nuotrauka', 'Vardas', 'Gaminys ir stilius', 'Pristatymas ir apmokėjimas'];
// Letters (Latin script, so Lithuanian included), digits, spaces and plain punctuation.
const NAME_OK = /^[\p{Script=Latin}\p{N} .,'’&!\-–]+$/u;

function sniff(bytes: Uint8Array): 'jpeg' | 'png' | 'heic' | 'other' {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
  const tag = String.fromCharCode(...bytes.slice(4, 12));
  if (tag.startsWith('ftyp') && ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(tag.slice(4))) return 'heic';
  return 'other';
}

function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.send(file);
  });
}

export default function OrderFlow({ config, cancelled, initialProduct }: { config: FlowConfig; cancelled: boolean; initialProduct?: string }) {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({
    name: '',
    secondLine: '',
    style: config.styles[0].key,
    product: initialProduct ?? config.products[0].key,
    size: config.sizes[0].key,
    frame: config.frames[0].key,
    phoneModel: '',
    customerName: '',
    email: '',
    phone: '',
    deliveryNetwork: config.networks[0],
    deliveryCity: '',
    deliveryAddress: '',
    acceptTerms: false,
  });
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'checking'>('idle');
  const [progress, setProgress] = useState(0);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [fieldError, setFieldError] = useState<{
    field: string;
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Restore after a reload or a cancelled payment.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        if (saved.photo?.photoId) setPhoto(saved.photo);
        if (saved.fields)
          setFields((f) => ({
            ...f,
            ...saved.fields,
            ...(initialProduct ? { product: initialProduct } : {}),
            acceptTerms: false,
          }));
        if (typeof saved.resumeToken === 'string') setResumeToken(saved.resumeToken);
        if (Number.isInteger(saved.step) && saved.photo?.photoId) setStep(Math.min(3, Math.max(0, saved.step)));
      }
    } catch {
      // Ignore unreadable saved state.
    }
    setRestored(true);
    track('order_start');
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ step, photo, fields, resumeToken }));
    } catch {
      // Private mode: the flow still works, it just is not restored.
    }
  }, [restored, step, photo, fields, resumeToken]);

  const set = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    if (fieldError?.field === key) setFieldError(null);
  };

  const go = (next: number) => {
    setFieldError(null);
    setStep(next);
    if (next === 3) track('details_done');
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0 });
    });
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPhotoErrors([]);
    setPhoto(null);
    setResumeToken(null);
    if (file.size > MAX_BYTES) {
      setPhotoErrors([`Failas per didelis: ${(file.size / 1048576).toFixed(1)} MB. Didžiausias leidžiamas dydis – 15 MB.`]);
      return;
    }
    const kind = sniff(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    if (kind === 'other') {
      setPhotoErrors(['Šio failo formato nepriimame. Tinka JPG, PNG ir HEIC (iPhone) nuotraukos.']);
      return;
    }
    try {
      setPhase('uploading');
      setProgress(0);
      const slotRes = await fetch('/api/ikelimas', { method: 'POST' });
      if (!slotRes.ok) throw new Error('slot');
      const slot = await slotRes.json();
      await putWithProgress(slot.upload.url, file, slot.upload.headers || {}, setProgress);
      setPhase('checking');
      const res = await fetch('/api/ikelimas/patvirtinti', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ photoId: slot.photoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'confirm');
      if (!data.ok) {
        setPhotoErrors(data.errors);
        track('photo_rejected');
      } else {
        setPhoto({
          photoId: data.photoId,
          thumb: data.thumb,
          preview: data.preview,
          warnings: data.warnings || [],
        });
        track('photo_ok');
      }
    } catch {
      setPhotoErrors(['Nepavyko įkelti nuotraukos. Patikrinkite interneto ryšį ir bandykite dar kartą.']);
    } finally {
      setPhase('idle');
    }
  }

  const nameTrimmed = fields.name.trim();
  const nameProblem =
    nameTrimmed.length === 0
      ? 'Įrašykite vardą.'
      : !NAME_OK.test(nameTrimmed)
        ? 'Varde gali būti tik raidės, skaitmenys ir paprasti skyrybos ženklai. Jaustukų atspausdinti negalime.'
        : fields.secondLine.trim() && !NAME_OK.test(fields.secondLine.trim().replace(/[/:()]/g, ''))
          ? 'Antroje eilutėje gali būti tik raidės, skaitmenys ir paprasti skyrybos ženklai.'
          : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFieldError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/uzsakymas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          photoId: photo?.photoId,
          resumeToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFieldError({
          field: data.field || 'form',
          message: data.error || 'Nepavyko sukurti užsakymo. Bandykite dar kartą.',
        });
        if (data.field === 'photo') {
          setPhoto(null);
          setResumeToken(null);
          setStep(0);
        } else if (data.field === 'name') setStep(1);
        else if (['style', 'product', 'size', 'frame', 'phoneModel'].includes(data.field)) setStep(2);
        setSubmitting(false);
        return;
      }
      setResumeToken(data.token);
      try {
        window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ step, photo, fields, resumeToken: data.token }));
      } catch {
        // see above
      }
      track('checkout');
      window.location.assign(data.checkoutUrl);
    } catch {
      setFieldError({
        field: 'form',
        message: 'Nepavyko susisiekti su serveriu. Patikrinkite ryšį ir bandykite dar kartą.',
      });
      setSubmitting(false);
    }
  }

  const err = (field: string) => (fieldError?.field === field ? fieldError.message : null);
  const size = config.sizes.find((s) => s.key === fields.size) ?? config.sizes[0];
  const style = config.styles.find((s) => s.key === fields.style) ?? config.styles[0];
  const frame = config.frames.find((f) => f.key === fields.frame) ?? config.frames[0];
  const product = config.products.find((p) => p.key === fields.product) ?? config.products[0];
  const isPoster = product.key === 'plakatas';
  // Print format the preview mirrors (keys of src/config SIZES).
  const format = isPoster ? fields.size : product.key;
  const total = isPoster ? size.price : product.total;
  const needsPhone = product.key === 'deklas' && !fields.phoneModel;
  const preview = (
    <div className={`poster-wrap poster-wrap--${product.key}`}>
      {isPoster ? (
        <div className={`frame frame--${fields.frame}`}>
          <div className="glass">
            <PosterPreview style={fields.style} size={format} name={nameTrimmed} secondLine={fields.secondLine.trim()} photo={photo?.preview} phoneModel={fields.phoneModel} />
          </div>
        </div>
      ) : (
        <PosterPreview style={fields.style} size={format} name={nameTrimmed} secondLine={fields.secondLine.trim()} photo={photo?.preview} phoneModel={fields.phoneModel} />
      )}
    </div>
  );

  return (
    <div className="wrap flow">
      <ol className="progress" aria-hidden="true">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className={i <= step ? 'done' : ''} />
        ))}
      </ol>
      <p className="step-count">
        {step + 1} žingsnis iš {STEP_TITLES.length}
      </p>
      <h1 ref={headingRef} tabIndex={-1}>
        {STEP_TITLES[step]}
      </h1>

      {cancelled && step === 3 ? (
        <div className="alert warn" role="status">
          <p>Mokėjimas neįvyko, užsakymas neapmokėtas. Jūsų duomenys išsaugoti: galite mokėti dar kartą.</p>
        </div>
      ) : null}
      {err('form') ? (
        <div className="alert" role="alert">
          <p>{err('form')}</p>
        </div>
      ) : null}

      {/* ---------------------------------------------------------------- 1 */}
      {step === 0 ? (
        <section aria-label="Nuotraukos įkėlimas">
          {err('photo') ? (
            <div className="alert" role="alert">
              <p>{err('photo')}</p>
            </div>
          ) : null}
          {photoErrors.length > 0 ? (
            <div className="alert" role="alert">
              <p>
                <strong>Ši nuotrauka netinka.</strong>
              </p>
              <ul>
                {photoErrors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {photo ? (
            <>
              <div className="upload-done">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumb} alt="Jūsų įkelta nuotrauka" width={96} height={96} />
                <div>
                  <strong>Nuotrauka tinka.</strong>
                  <label
                    className="small"
                    style={{
                      display: 'block',
                      marginTop: 4,
                      color: 'var(--accent)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Įkelti kitą
                    <input type="file" className="visually-hidden" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" onChange={(e) => onFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
              {photo.warnings.length > 0 ? (
                <div className="alert warn" role="status">
                  <ul>
                    {photo.warnings.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : phase !== 'idle' ? (
            <div className="upload" role="status" aria-live="polite">
              <strong>{phase === 'uploading' ? `Keliama… ${Math.round(progress * 100)} %` : 'Tikriname nuotrauką…'}</strong>
              <span className="small muted">Neuždarykite puslapio.</span>
              <div className="bar">
                <i
                  style={{
                    width: `${phase === 'uploading' ? progress * 100 : 100}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <label className="upload">
              <input type="file" accept="image/jpeg,image/png,image/heic,image/heif,.heic,.heif" onChange={(e) => onFile(e.target.files?.[0])} />
              <strong>Pasirinkite nuotrauką</strong>
              <span className="small muted">JPG, PNG arba HEIC, iki 15 MB</span>
            </label>
          )}

          <div className="goodbad" aria-label="Kokia nuotrauka tinka">
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nuotraukos/tinka.jpg" width={480} height={600} alt="Tinkama nuotrauka: šuo iš arti, akys aiškios, dienos šviesa" loading="lazy" />
              <figcaption>
                <strong>Tinka</strong>
                Snukis iš arti, akys aiškiai matosi, dienos šviesa, augintinis žiūri į kamerą arba šiek tiek į šoną.
              </figcaption>
            </figure>
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nuotraukos/netinka.jpg" width={480} height={600} alt="Netinkama nuotrauka: tamsi ir išplaukusi" loading="lazy" />
              <figcaption>
                <strong>Netinka</strong>
                Augintinis toli, tamsu, vaizdas išplaukęs, snukis uždengtas arba nuotrauka atsiųsta per „Messenger“.
              </figcaption>
            </figure>
          </div>
          <p className="small muted goodbad-note">Abu pavyzdžiai iš tos pačios nuotraukos: dešinėje ji specialiai patamsinta ir sulieta.</p>

          <div className="flow-nav">
            <button type="button" className="btn" disabled={!photo} onClick={() => go(1)}>
              Toliau: vardas
            </button>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- 2 */}
      {step === 1 ? (
        <section aria-label="Vardas plakate">
          {preview}
          <p className="poster-note">Vardas bus parašytas šiuo šriftu. Nuotrauka čia tik vietai parodyti: portretą nupiešime ir atsiųsime jums peržiūrėti.</p>

          <div className="field">
            <label htmlFor="name">Augintinio vardas</label>
            <input
              id="name"
              type="text"
              value={fields.name}
              maxLength={config.nameMax}
              autoComplete="off"
              autoCapitalize="words"
              aria-invalid={Boolean(err('name'))}
              aria-describedby="name-hint"
              onChange={(e) => set('name', e.target.value)}
            />
            <span className="hint" id="name-hint">
              Iki {config.nameMax} ženklų. Lietuviškos raidės (ą, č, ę, ė, į, š, ų, ū, ž) bus atspausdintos tiksliai taip, kaip įrašysite.
            </span>
            {err('name') ? (
              <p className="error" role="alert">
                {err('name')}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="second">Antra eilutė (nebūtina)</label>
            <input
              id="second"
              type="text"
              value={fields.secondLine}
              maxLength={config.secondMax}
              autoComplete="off"
              aria-describedby="second-hint"
              onChange={(e) => set('secondLine', e.target.value)}
            />
            <span className="hint" id="second-hint">
              Pavyzdžiui, metai „2014 – 2026“ arba trumpas tekstas. Iki {config.secondMax} ženklų.
            </span>
          </div>
          {nameTrimmed.length > 0 && nameProblem ? (
            <p className="error" role="alert">
              {nameProblem}
            </p>
          ) : null}

          <div className="flow-nav">
            <button type="button" className="btn" disabled={Boolean(nameProblem)} onClick={() => go(2)}>
              Toliau: gaminys ir stilius
            </button>
            <button type="button" className="btn ghost" onClick={() => go(0)}>
              Atgal
            </button>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- 3 */}
      {step === 2 ? (
        <section aria-label="Gaminys, stilius ir dydis">
          {preview}

          <fieldset>
            <legend>Ant ko spausdinti</legend>
            <div className="choices">
              {config.products.map((p) => (
                <label className="choice" key={p.key}>
                  <input type="radio" name="product" value={p.key} checked={fields.product === p.key} onChange={() => set('product', p.key)} />
                  <span>
                    <strong>{p.label}</strong>
                    <small>{p.note}</small>
                  </span>
                  <span className="price">{p.price}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {product.key === 'deklas' ? (
            <div className="field">
              <label htmlFor="phone-model">Telefono modelis</label>
              <select
                id="phone-model"
                value={fields.phoneModel}
                aria-invalid={Boolean(err('phoneModel'))}
                aria-describedby="phone-model-hint"
                onChange={(e) => set('phoneModel', e.target.value)}
              >
                <option value="">Pasirinkite…</option>
                {config.phoneModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="hint" id="phone-model-hint">
                Jei savo modelio sąraše nerandate, parašykite mums prieš užsakydami.
              </span>
              {err('phoneModel') ? (
                <p className="error" role="alert">
                  {err('phoneModel')}
                </p>
              ) : null}
            </div>
          ) : null}

          <fieldset>
            <legend>Stilius</legend>
            <div className="choices">
              {config.styles.map((s) => (
                <label className="choice" key={s.key}>
                  <input type="radio" name="style" value={s.key} checked={fields.style === s.key} onChange={() => set('style', s.key)} />
                  <span>
                    <strong>{s.title}</strong>
                    <small>{s.description}</small>
                  </span>
                  <span className={`style-chip style-chip--${s.key}`} aria-hidden="true" />
                </label>
              ))}
            </div>
          </fieldset>

          {isPoster ? (
            <>
              <fieldset>
                <legend>Dydis</legend>
                <div className="choices">
                  {config.sizes.map((s) => (
                    <label className="choice" key={s.key}>
                      <input type="radio" name="size" value={s.key} checked={fields.size === s.key} onChange={() => set('size', s.key)} />
                      <span>
                        <strong>{s.label}</strong>
                        <small>Su rėmeliu ir pristatymu į paštomatą</small>
                      </span>
                      <span className="price">{s.price}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Rėmelio spalva</legend>
                <div className="choices">
                  {config.frames.map((f) => (
                    <label className="choice" key={f.key}>
                      <input type="radio" name="frame" value={f.key} checked={fields.frame === f.key} onChange={() => set('frame', f.key)} />
                      <span>
                        <strong>{f.label}</strong>
                      </span>
                      <span className={`frame frame--${f.key} mini`} aria-hidden="true">
                        <span className="glass" />
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}

          <div className="flow-nav">
            <button type="button" className="btn" disabled={needsPhone} onClick={() => go(3)}>
              Toliau: pristatymas
            </button>
            <button type="button" className="btn ghost" onClick={() => go(1)}>
              Atgal
            </button>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- 4 */}
      {step === 3 ? (
        <form onSubmit={submit} noValidate aria-label="Pristatymas ir apmokėjimas">
          <fieldset>
            <legend>Paštomatų tinklas</legend>
            <div className="choices">
              {config.networks.map((n) => (
                <label className="choice" key={n}>
                  <input type="radio" name="network" value={n} checked={fields.deliveryNetwork === n} onChange={() => set('deliveryNetwork', n)} />
                  <span>
                    <strong>{n}</strong>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="city">Miestas</label>
            <input
              id="city"
              type="text"
              value={fields.deliveryCity}
              maxLength={60}
              autoComplete="address-level2"
              aria-invalid={Boolean(err('deliveryCity'))}
              onChange={(e) => set('deliveryCity', e.target.value)}
            />
            {err('deliveryCity') ? (
              <p className="error" role="alert">
                {err('deliveryCity')}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="locker">Paštomato adresas arba pavadinimas</label>
            <input
              id="locker"
              type="text"
              value={fields.deliveryAddress}
              maxLength={120}
              autoComplete="off"
              aria-invalid={Boolean(err('deliveryAddress'))}
              aria-describedby="locker-hint"
              onChange={(e) => set('deliveryAddress', e.target.value)}
            />
            <span className="hint" id="locker-hint">
              Pavyzdžiui: „Ozo g. 25, Akropolis“.
            </span>
            {err('deliveryAddress') ? (
              <p className="error" role="alert">
                {err('deliveryAddress')}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="cname">Vardas ir pavardė</label>
            <input
              id="cname"
              type="text"
              value={fields.customerName}
              maxLength={80}
              autoComplete="name"
              aria-invalid={Boolean(err('customerName'))}
              onChange={(e) => set('customerName', e.target.value)}
            />
            {err('customerName') ? (
              <p className="error" role="alert">
                {err('customerName')}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="email">El. paštas</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={fields.email}
              maxLength={120}
              autoComplete="email"
              autoCapitalize="none"
              aria-invalid={Boolean(err('email'))}
              aria-describedby="email-hint"
              onChange={(e) => set('email', e.target.value)}
            />
            <span className="hint" id="email-hint">
              Čia per {config.previewDays} darbo d. atsiųsime portreto peržiūrą. Be jūsų patvirtinimo nespausdiname.
            </span>
            {err('email') ? (
              <p className="error" role="alert">
                {err('email')}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="phone">Telefonas</label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={fields.phone}
              maxLength={30}
              autoComplete="tel"
              aria-invalid={Boolean(err('phone'))}
              aria-describedby="phone-hint"
              onChange={(e) => set('phone', e.target.value)}
            />
            <span className="hint" id="phone-hint">
              Į šį numerį paštomatas atsiųs atsiėmimo kodą.
            </span>
            {err('phone') ? (
              <p className="error" role="alert">
                {err('phone')}
              </p>
            ) : null}
          </div>

          <h2 style={{ fontSize: 26, margin: '26px 0 6px' }}>Jūsų užsakymas</h2>
          <dl className="summary">
            <div>
              <dt>Gaminys</dt>
              <dd>{product.label}</dd>
            </div>
            <div>
              <dt>Vardas</dt>
              <dd>{nameTrimmed}</dd>
            </div>
            {fields.secondLine.trim() ? (
              <div>
                <dt>Antra eilutė</dt>
                <dd>{fields.secondLine.trim()}</dd>
              </div>
            ) : null}
            <div>
              <dt>Stilius</dt>
              <dd>{style.title}</dd>
            </div>
            {isPoster ? (
              <>
                <div>
                  <dt>Dydis</dt>
                  <dd>{size.label}</dd>
                </div>
                <div>
                  <dt>Rėmelis</dt>
                  <dd>{frame.label}</dd>
                </div>
              </>
            ) : product.key === 'deklas' ? (
              <div>
                <dt>Telefono modelis</dt>
                <dd>{fields.phoneModel}</dd>
              </div>
            ) : (
              <div>
                <dt>Dydis</dt>
                <dd>100×150 cm</dd>
              </div>
            )}
            <div>
              <dt>Pristatymas</dt>
              <dd>Į paštomatą, įskaičiuotas</dd>
            </div>
            <div className="total">
              <dt>Iš viso</dt>
              <dd>{total}</dd>
            </div>
          </dl>

          <p className="small muted">{config.deliveryNote}</p>
          <p className="small muted">{config.aiDisclosure}</p>

          <label className="check">
            <input type="checkbox" checked={fields.acceptTerms} onChange={(e) => set('acceptTerms', e.target.checked)} aria-invalid={Boolean(err('acceptTerms'))} />
            <span>
              Sutinku su{' '}
              <Link href="/taisykles" target="_blank">
                pirkimo taisyklėmis
              </Link>{' '}
              ir{' '}
              <Link href="/privatumas" target="_blank">
                privatumo politika
              </Link>
              . Žinau, kad pagal mano užsakymą pagaminto portreto grąžinti negalima, nebent jis su defektu.
            </span>
          </label>
          {err('acceptTerms') ? (
            <p className="error" role="alert">
              {err('acceptTerms')}
            </p>
          ) : null}
          {err('deliveryNetwork') ? (
            <p className="error" role="alert">
              {err('deliveryNetwork')}
            </p>
          ) : null}

          <div className="flow-nav">
            <button type="submit" className="btn accent" disabled={submitting}>
              {submitting ? 'Jungiamasi prie mokėjimo…' : `Apmokėti ${total}`}
            </button>
            <button type="button" className="btn ghost" onClick={() => go(2)} disabled={submitting}>
              Atgal
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
