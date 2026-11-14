import { createPhotoUpload } from '@/server/orders.js';
import { errorResponse } from '@/server/http.js';

// Step 1 of the upload: returns where the browser should send the file.
// The file itself never passes through this handler (hosting limits request
// bodies to a few megabytes; photos are up to 15 MB).
export async function POST() {
  try {
    return Response.json(await createPhotoUpload());
  } catch (err) {
    return errorResponse(err, 'ikelimas');
  }
}
