import { cleanLead, handle } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { existingKeys, insertLeads } from "@/lib/db";
import { withoutDuplicates } from "@/lib/dedupe";
import { STATUS_IDS, type StatusId } from "@/lib/types";

/** Bulk import: JSON array of leads (e.g. the old Žvalgas backup). Keeps status and note when present. */
export async function POST(request: Request) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  return handle(async () => {
    const body = await request.json().catch(() => null);
    const list = Array.isArray(body) ? body : Array.isArray(body?.leads) ? body.leads : null;
    if (!list) return Response.json({ error: "Reikia JSON masyvo" }, { status: 400 });
    if (list.length > 2000) return Response.json({ error: "Daugiausiai 2000 vienu kartu" }, { status: 400 });

    const items = list
      .map((raw: Record<string, unknown>) => {
        const lead = cleanLead(raw);
        if (!lead) return null;
        const status = (STATUS_IDS as string[]).includes(String(raw?.status)) ? (raw.status as StatusId) : "new";
        const note = typeof raw?.note === "string" ? raw.note : "";
        return { ...lead, status, note };
      })
      .filter(Boolean) as (ReturnType<typeof cleanLead> & { status: StatusId; note: string })[];

    const { fresh, dupes } = withoutDuplicates(items, await existingKeys());
    const created = await insertLeads(fresh, user);
    return Response.json({ added: created.length, skipped: dupes + (list.length - items.length) });
  });
}
