import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coldai",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}
