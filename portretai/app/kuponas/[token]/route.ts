import { getOrderByToken } from '@/server/orders.js';
import { buildVoucherPdf } from '@/server/voucher.js';

export const maxDuration = 30;

export async function GET(_request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const order = await getOrderByToken(token);
  if (!order || !order.paidAt || order.status === 'atsaukta') return new Response('Not found', { status: 404 });
  const pdf = await buildVoucherPdf(order);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="dovanu-kuponas-${order.code}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
