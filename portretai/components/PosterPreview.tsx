'use client';

// Live poster mock for the name step. It reads the same style files as the
// print layout (stiliai/*.json): same typeface, same proportions, same
// upper-casing and letter spacing. The print file itself is still made on
// the server; this is a preview of the lettering, not of the portrait.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import akvarele from '@/stiliai/akvarele.json';
import aliejus from '@/stiliai/aliejus.json';
import grafika from '@/stiliai/grafika.json';

type TextSpec = { font: string; size: number; uppercase: boolean; spacing: number };
type StyleSpec = { layout: string; name: TextSpec; secondLine: TextSpec; paper?: string };

const STYLES: Record<string, StyleSpec> = { akvarele, aliejus, grafika };

const FONTS: Record<string, { family: string; weight: number; style: 'normal' | 'italic' }> = {
  'CormorantGaramond_500Medium_Italic.ttf': { family: 'Cormorant', weight: 500, style: 'italic' },
  'CormorantGaramond_500Medium.ttf': { family: 'Cormorant', weight: 500, style: 'normal' },
  'PlayfairDisplay_500Medium.ttf': { family: 'Playfair', weight: 500, style: 'normal' },
  'Jost_600SemiBold.ttf': { family: 'Jost', weight: 600, style: 'normal' },
  'Jost_400Regular.ttf': { family: 'Jost', weight: 400, style: 'normal' },
};

// Mirrors src/config.js SIZES: trim size in mm, safe zone, and for phone
// cases the share of the height hidden behind the camera module.
const SIZES: Record<string, { w: number; h: number; safe: number; reserve?: number }> = {
  '30x40': { w: 300, h: 400, safe: 10 },
  a4: { w: 210, h: 297, safe: 10 },
  pledas: { w: 1000, h: 1500, safe: 45 },
  deklas: { w: 75, h: 155, safe: 6, reserve: 0.25 },
};
const ART: Record<string, { bg: string; fg: string; paper: string; ink: string }> = {
  akvarele: { bg: 'linear-gradient(#e9dfcf 0%, #efe7da 60%, #fdfcf9 100%)', fg: '#7a6f60', paper: '#fdfcf9', ink: '#2a2622' },
  aliejus: { bg: '#2a211a', fg: '#b9a98f', paper: '#f4efe4', ink: '#2b2620' },
  grafika: { bg: 'linear-gradient(#e2d3b6 0%, #e2d3b6 78%, #efe7d6 100%)', fg: '#6d6046', paper: '#efe7d6', ink: '#2a2622' },
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function PosterPreview({
  style,
  size,
  name,
  secondLine,
  photo,
}: {
  style: string;
  size: string;
  name: string;
  secondLine: string;
  photo?: string;
}) {
  const spec = STYLES[style] ?? STYLES.akvarele;
  const art = ART[style] ?? ART.akvarele;
  const dims = SIZES[size] ?? SIZES['30x40'];
  const ratio = dims.h / dims.w; // poster height in widths
  const safe = dims.safe / dims.w;
  const reserve = (dims.reserve ?? 0) * ratio;
  const kind = size === 'pledas' ? 'pledas' : size === 'deklas' ? 'deklas' : 'plakatas';

  // Geometry in fractions of the poster width, mirroring src/layout.js.
  let artBox: { left: number; top: number; width: number; height: number };
  let textTop: number;
  let maxText: number;
  if (spec.layout === 'margins') {
    const m = 0.085;
    artBox = { left: m, top: Math.max(m, reserve), width: 1 - 2 * m, height: (1 - 2 * m) / 0.8 };
    textTop = artBox.top + artBox.height;
    maxText = artBox.width;
  } else {
    const imgH = 1 / 0.8;
    const band = Math.max(0.19 * ratio, ratio - reserve - imgH + 0.1 * imgH);
    artBox = { left: 0, top: reserve, width: 1, height: ratio - band - reserve };
    textTop = ratio - band;
    maxText = 1 - 2 * safe;
  }
  const textBottom = ratio - safe;

  const shownName = (spec.name.uppercase ? name.toLocaleUpperCase('lt-LT') : name) || 'Vardas';
  const shownSecond = spec.secondLine.uppercase ? secondLine.toLocaleUpperCase('lt-LT') : secondLine;
  const nameFont = FONTS[spec.name.font];
  const secondFont = FONTS[spec.secondLine.font];

  const boxRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState({ name: 1, second: 1 });
  const fitRef = useRef(fit);

  useIsoLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const box = boxRef.current;
      if (!box || cancelled) return;
      const limit = box.clientWidth * maxText;
      const next = { name: 1, second: 1 };
      for (const [key, ref] of [['name', nameRef], ['second', secondRef]] as const) {
        const el = ref.current;
        if (!el) continue;
        // Width at full size = current width divided by the current shrink factor.
        const natural = el.getBoundingClientRect().width / fitRef.current[key];
        if (natural > limit && natural > 0) next[key] = (limit / natural) * 0.995;
      }
      if (Math.abs(next.name - fitRef.current.name) > 0.002 || Math.abs(next.second - fitRef.current.second) > 0.002) {
        fitRef.current = next;
        setFit(next);
      }
    };
    measure();
    // Measure again once the web fonts have arrived.
    document.fonts?.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', measure);
    };
  }, [shownName, shownSecond, style, size, maxText]);

  const pct = (v: number) => `${v * 100}cqw`;

  return (
    <div
      ref={boxRef}
      className={`poster poster--${kind}`}
      style={{ aspectRatio: `${dims.w} / ${dims.h}`, background: art.paper }}
      role="img"
      aria-label={`${kind === 'pledas' ? 'Pledo' : kind === 'deklas' ? 'Dėklo' : 'Plakato'} maketas: vardas „${shownName}“${shownSecond ? `, antra eilutė „${shownSecond}“` : ''}`}
    >
      <div
        className="art"
        style={{ left: pct(artBox.left), top: pct(artBox.top), width: pct(artBox.width), height: pct(artBox.height), background: art.bg, color: art.fg }}
        aria-hidden="true"
      >
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="art-photo" src={photo} alt="" />
            {spec.layout === 'full' ? <span className="art-fade" style={{ background: `linear-gradient(transparent, ${art.paper})` }} /> : null}
            {spec.layout === 'full' && reserve > 0 ? <span className="art-fade art-fade--top" style={{ background: `linear-gradient(${art.paper}, transparent)` }} /> : null}
            <span className="art-tag">Jūsų nuotrauka · portretą nupiešime</span>
          </>
        ) : (
          <>
            Čia bus
            <br />
            portretas
          </>
        )}
      </div>
      {kind === 'deklas' ? (
        <span className="camera" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
      <div
        className="text"
        style={{ top: pct(textTop), height: pct(textBottom - textTop), paddingTop: spec.layout === 'margins' ? pct(spec.name.size * 0.45) : 0, color: art.ink }}
        aria-hidden="true"
      >
        <span
          ref={nameRef}
          className="name"
          style={{
            fontFamily: `'${nameFont.family}', serif`,
            fontWeight: nameFont.weight,
            fontStyle: nameFont.style,
            fontSize: `calc(${pct(spec.name.size)} * ${fit.name})`,
            letterSpacing: `${spec.name.spacing}em`,
            marginRight: `-${spec.name.spacing}em`,
          }}
        >
          {shownName}
        </span>
        {shownSecond ? (
          <span
            ref={secondRef}
            className="second"
            style={{
              fontFamily: `'${secondFont.family}', serif`,
              fontWeight: secondFont.weight,
              fontStyle: secondFont.style,
              fontSize: `calc(${pct(spec.secondLine.size)} * ${fit.second})`,
              letterSpacing: `${spec.secondLine.spacing}em`,
              marginRight: `-${spec.secondLine.spacing}em`,
              marginTop: pct(spec.secondLine.size * 1.1),
              opacity: 0.82,
            }}
          >
            {shownSecond}
          </span>
        ) : null}
      </div>
    </div>
  );
}
