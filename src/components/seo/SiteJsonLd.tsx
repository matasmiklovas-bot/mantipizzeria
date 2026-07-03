import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: SITE_NAME,
    alternateName: ["Manti Pizzeria", "mantipizzeria", "Mantipizzeria"],
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-mark.png`,
    image: `${SITE_URL}/brand/logo-mark.png`,
    description: SITE_DESCRIPTION,
    servesCuisine: ["Italian", "Pizza", "Neapolitan"],
    priceRange: "€€",
    telephone: "+37063878788",
    email: "info@mantipizzeria.lt",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Vaivorykštės g. 53",
      addressLocality: "Palanga",
      postalCode: "00222",
      addressCountry: "LT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 55.9175,
      longitude: 21.0686,
    },
    sameAs: [],
    potentialAction: {
      "@type": "OrderAction",
      target: `${SITE_URL}/t/1`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
