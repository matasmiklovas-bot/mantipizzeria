import { confirmPhotoUpload } from '@/server/orders.js';
import { errorResponse, readJson } from '@/server/http.js';

// HEIC decoding of a 12-megapixel photo takes a few seconds.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { photoId } = await readJson(request);
    return Response.json(await confirmPhotoUpload(photoId));
  } catch (err) {
    return errorResponse(err, 'ikelimas/patvirtinti');
  }
}
