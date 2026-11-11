import { createOrder } from '@/server/orders.js';
import { errorResponse, readJson } from '@/server/http.js';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const input = await readJson(request);
    const { order, checkoutUrl } = await createOrder(input);
    // The token lets the same browser retry payment for this order.
    return Response.json({ checkoutUrl, token: order.token });
  } catch (err) {
    return errorResponse(err, 'uzsakymas');
  }
}
