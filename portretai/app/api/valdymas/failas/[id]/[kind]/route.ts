import { isAdmin } from '@/app/valdymas/_auth';
import { db } from '@/server/db.js';
import { readOrderFile } from '@/server/orders.js';

// Order files for the owner. The print PDF is returned only for a portrait
// the customer has approved (enforced in readOrderFile).
export async function GET(_request: Request, ctx: { params: Promise<{ id: string; kind: string }> }) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const { id, kind } = await ctx.params;
  const order = await (await db()).getOrder(id);
  if (!order) return new Response('Not found', { status: 404 });
  const file = await readOrderFile(order, kind);
  if (!file) return new Response(kind === 'print' ? 'Spaudos failas išduodamas tik kliento patvirtintam portretui.' : 'Not found', { status: 404 });
  const inline = kind !== 'print' && kind !== 'photo' && kind !== 'portrait';
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${file.fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
