import { trackEvent } from '@/server/analytics.js';

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 2000) return new Response(null, { status: 204 });
    const data = JSON.parse(text);
    await trackEvent({
      name: data.name,
      path: data.path,
      referrer: data.referrer,
      source: data.source,
      userAgent: request.headers.get('user-agent') || '',
    });
  } catch {
    // Counting visits is best effort.
  }
  return new Response(null, { status: 204 });
}
