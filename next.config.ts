import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "mantipizzeria.lt" }],
        destination: "https://www.mantipizzeria.lt/:path*",
        permanent: true,
      },
      {
        // Short links for the car-service pages in public/autoservisai; they use
        // relative asset paths, so redirect rather than rewrite.
        source: "/autoservisai/:site(megamesta|naujospadangos)",
        destination: "/autoservisai/:site/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
