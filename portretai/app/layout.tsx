import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import LogoMark from '@/components/LogoMark';
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
            <LogoMark />
            {SETTINGS.brand}
          </Link>
          <nav aria-label="Pagrindinis">
            <Link href="/uzsakymas">Užsakyti</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p className="footer-brand">
              <LogoMark size={40} id="snk-f" />
              <span>
                <strong>{SETTINGS.brand}</strong>
                Augintinių portretai pagal nuotrauką. Pristatome į paštomatus Lietuvoje.
              </span>
            </p>
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
