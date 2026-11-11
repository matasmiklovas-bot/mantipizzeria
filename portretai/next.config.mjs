/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Image and PDF libraries run as plain Node modules, not bundled.
  serverExternalPackages: ['heic-convert', 'heic-decode', 'libheif-js', 'opentype.js', 'pdf-lib'],
  // The poster renderer reads fonts and style files from disk at run time.
  outputFileTracingIncludes: {
    '/*': ['./sriftai/*.ttf', './stiliai/*'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        // Admin and customer order pages must never be cached or indexed.
        source: '/(valdymas|perziura|kuponas|uzsakymas/aciu)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default nextConfig;
