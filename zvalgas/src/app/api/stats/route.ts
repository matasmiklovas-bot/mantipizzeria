import { handle } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { stats } from "@/lib/db";

export async function GET(request: Request) {
  if (!userFrom(request)) return unauthorized();
  return handle(async () => Response.json(await stats()));
}
