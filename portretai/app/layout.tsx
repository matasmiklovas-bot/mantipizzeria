import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { SETTINGS, siteUrl, contactEmail } from '@/server/settings.js';
import Beacon from '@/components/Beacon';
import Pixels from '@/components/Pixels';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SETTINGS.brand}: augintinio portretas su vardu pagal nuotrauką`,
    template: `%s · ${SETTINGS.brand}`,
  },
  description:
    'Įkeliate šuns ar katės nuotrauką ir įrašote vardą. Nupiešiame portretą ir atspausdiname ant paveikslo su rėmeliu, pledo arba telefono dėklo. Prieš spaudą atsiunčiame peržiūrą.',
  openGraph: { type: 'website', locale: 'lt_LT', siteName: SETTINGS.brand },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f6f2ea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const contact = contactEmail();
  return (
    <html lang="lt">
      <head>
        <link rel="preload" href="/sriftai/Jost_400Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/sriftai/Bricolage_latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {process.env.ALLOW_TEST_HOOKS === '1' ? (
          <p className="demo-banner" role="note">
            Bandomoji versija: mokėjimai ir laiškai netikri.
          </p>
        ) : null}
        <header className="site-header">
          <Link href="/" className="wordmark">
            <svg className="mark" viewBox="0 0 24 30" width="20" height="25" aria-hidden="true">
              <rect x="1.5" y="1.5" width="21" height="27" fill="none" stroke="currentColor" strokeWidth="2.4" />
              <rect x="7.5" y="7.5" width="13" height="15" fill="#ff5aa5" />
              <rect x="5.5" y="5.5" width="13" height="15" fill="#2a3bd1" style={{ mixBlendMode: 'multiply' }} />
              <rect x="7" y="23" width="10" height="1.8" fill="currentColor" />
            </svg>
            {SETTINGS.brand}
          </Link>
          <nav aria-label="Pagrindinis">
            <Link href="/uzsakymas">Užsakyti</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <ul>
              <li>
                <Link href="/taisykles">Pirkimo taisyklės</Link>
              </li>
              <li>
                <Link href="/grazinimas">Grąžinimas</Link>
              </li>
              <li>
                <Link href="/privatumas">Privatumas</Link>
              </li>
              {contact ? (
                <li>
                  <a href={`mailto:${contact}`}>{contact}</a>
                </li>
              ) : null}
            </ul>
            <p className="small">{SETTINGS.aiDisclosure}</p>
          </div>
        </footer>
        <Beacon />
        <Pixels />
      </body>
    </html>
  );
}
