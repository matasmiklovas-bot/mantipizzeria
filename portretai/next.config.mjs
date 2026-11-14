import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This project lives in a subfolder of a repository that holds another
// site. Pin the root here so the other site's lockfile and PostCSS config
// are not picked up.
const here = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  turbopack: { root: here },
  outputFileTracingRoot: here,
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
          // ALLOW_FRAMING=1 at build time lets an app preview pane embed the
          // site (demo only). Production keeps DENY.
          ...(process.env.ALLOW_FRAMING === '1' ? [] : [{ key: 'X-Frame-Options', value: 'DENY' }]),
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
