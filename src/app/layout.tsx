import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
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
  title: {
    default: "Manti Pizzeria | Autentiškos itališkos picos",
    template: "%s | Manti Pizzeria",
  },
  description:
    "Autentiškos itališkos picos, ruošiamos iš šviežių ingredientų ir kepamos su meile. Užsisakykite tiesiai nuo staliuko.",
  keywords: ["pica", "pizzeria", "itališka pica", "Vilnius", "Manti Pizzeria"],
  openGraph: {
    title: "Manti Pizzeria",
    description: "Autentiškos itališkos picos, ruošiamos su meile",
    type: "website",
    locale: "lt_LT",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lt" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
