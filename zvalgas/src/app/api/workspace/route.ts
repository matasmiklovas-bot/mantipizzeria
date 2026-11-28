import { baseUrl } from "@/lib/oauth";
import { isManager } from "@/lib/rules";
import { json, me, unauthorized } from "@/lib/session";
import { getWorkspace, updateWorkspace, type Workspace } from "@/lib/store";

/** The team: its name, and for managers the invite link that lets a new person join it. */
async function view(request: Request, w: Workspace | null, manager: boolean) {
  return { name: w?.name || "", invite: manager && w ? `${baseUrl(request)}/login?join=${w.invite}` : "", canEdit: manager };
}

export async function GET(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  return json(await view(request, await getWorkspace(u.ws), await isManager(u)));
}

/** { name } renames the team; { rotate: true } makes a new invite link (the old one stops working). */
export async function POST(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  if (!(await isManager(u))) return json({ error: "Keisti gali savininkas arba vadovas." }, 403);
  const b = (await request.json().catch(() => ({}))) as { name?: unknown; rotate?: unknown };
  const name = typeof b.name === "string" ? b.name.trim() : undefined;
  if (name !== undefined && !name) return json({ error: "Įrašyk pavadinimą." }, 400);
  const w = await updateWorkspace(u.ws, { name, rotate: b.rotate === true });
  return json(await view(request, w, true));
}
