import { getOrderByToken, readOrderFile } from '@/server/orders.js';

// The watermarked preview, for the holder of the order's secret link only.
export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);
  if (!order || order.portraitVersion < 1 || order.status === 'atsaukta') return new Response('Not found', { status: 404 });
  const file = await readOrderFile(order, 'preview');
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { 'Content-Type': file.contentType, 'Cache-Control': 'private, max-age=300', 'X-Robots-Tag': 'noindex' },
  });
}
