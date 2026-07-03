import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mantì Pizzeria | Pica Palangoje — mantipizzeria",
    template: "%s | Mantì Pizzeria",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "mantipizzeria",
    "manti pizzeria",
    "pica palanga",
    "pizzeria palanga",
    "neapolietiška pica",
    "itališka pica",
    "užsakyti picą",
    "Mantì Pizzeria",
  ],
  applicationName: "Mantì Pizzeria",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "lt_LT",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Mantì Pizzeria — pica Palangoje",
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/brand/logo.png",
        width: 400,
        height: 240,
        alt: "Mantì Pizzeria logotipas",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Mantì Pizzeria — pica Palangoje",
    description: SITE_DESCRIPTION,
    images: ["/brand/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
