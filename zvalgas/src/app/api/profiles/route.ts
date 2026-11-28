import { json, me, unauthorized } from "@/lib/session";
import { profiles } from "@/lib/store";

export async function POST(request: Request) {
  const u = await me(request).catch(() => null);
  if (!u) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { ids?: unknown };
  const ids = (Array.isArray(body.ids) ? body.ids : []).filter((x): x is string => typeof x === "string").slice(0, 200);
  const rows = await profiles(u.ws, ids);
  return json(Object.fromEntries(rows.map((r) => [r.id, { name: r.name, avatarUrl: r.avatar }])));
}
