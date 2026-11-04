import { cleanLead, handle } from "@/lib/api";
import { unauthorized, userFrom } from "@/lib/auth";
import { addNote, deleteLead, logCall, setStatus, updateLeadFields } from "@/lib/db";
import { STATUS_IDS, type StatusId } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const isStatus = (s: unknown): s is StatusId => typeof s === "string" && (STATUS_IDS as string[]).includes(s);

/**
 * Body shapes:
 *  { action: "call", status, note?, callbackAt? }  – log a call outcome
 *  { action: "status", status }                     – change status without a call
 *  { action: "note", note }                         – add a note to the thread
 *  { action: "edit", fields }                       – edit business details
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  const { id } = await params;
  return handle(async () => {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 4000) : "";
    let result: unknown = null;

    if (b.action === "call" && isStatus(b.status)) {
      let callbackAt: string | null = null;
      if (b.status === "thinking" && typeof b.callbackAt === "string" && !Number.isNaN(Date.parse(b.callbackAt))) {
        callbackAt = new Date(b.callbackAt).toISOString();
      }
      result = await logCall(id, user, b.status, note, callbackAt);
    } else if (b.action === "status" && isStatus(b.status)) {
      result = await setStatus(id, user, b.status);
    } else if (b.action === "note" && note) {
      result = await addNote(id, user, note);
    } else if (b.action === "edit") {
      const fields = cleanLead({ name: "x", ...(b.fields as object) });
      if (!fields) return Response.json({ error: "Blogi duomenys" }, { status: 400 });
      const given = (b.fields ?? {}) as Record<string, unknown>;
      const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => k in given));
      const lead = await updateLeadFields(id, patch);
      result = lead ? { lead } : null;
    } else {
      return Response.json({ error: "Nežinomas veiksmas" }, { status: 400 });
    }

    if (!result) return Response.json({ error: "Kontaktas nerastas" }, { status: 404 });
    return Response.json(result);
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const user = userFrom(request);
  if (!user) return unauthorized();
  const { id } = await params;
  return handle(async () => {
    await deleteLead(id);
    return new Response(null, { status: 204 });
  });
}
