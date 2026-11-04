import { cleanLead, handle } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { existingKeys, insertLeads, listLeads } from "@/lib/db";
import { withoutDuplicates } from "@/lib/dedupe";

export async function GET(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  return handle(async () => Response.json({ leads: await listLeads(), me: user }));
}

/** Manual add of one lead. */
export async function POST(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  return handle(async () => {
    const lead = cleanLead(await request.json().catch(() => null));
    if (!lead) return Response.json({ error: "Trūksta pavadinimo" }, { status: 400 });
    const { fresh } = withoutDuplicates([lead], await existingKeys());
    if (!fresh.length) return Response.json({ error: "Toks kontaktas jau yra sąraše" }, { status: 409 });
    const [created] = await insertLeads(fresh, user);
    return Response.json({ lead: created });
  });
}
