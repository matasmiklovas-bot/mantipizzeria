import type { MetadataRoute } from 'next';
import { siteUrl } from '@/server/settings.js';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/valdymas', '/perziura', '/kuponas', '/bandymas', '/api', '/uzsakymas/aciu'] }],
    host: siteUrl(),
  };
}
