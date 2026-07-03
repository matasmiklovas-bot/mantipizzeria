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
    ];
  },
};

export default nextConfig;
