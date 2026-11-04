import { handle } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { listActivities } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!userFrom(request)) return unauthorized();
  const { id } = await params;
  return handle(async () => Response.json({ activities: await listActivities(id) }));
}
