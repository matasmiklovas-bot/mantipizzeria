import { json, me, unauthorized } from "@/lib/session";
import { isCollection, list, version } from "@/lib/store";

export async function GET(request: Request, ctx: { params: Promise<{ col: string }> }) {
  const { col } = await ctx.params;
  if (!isCollection(col)) return json({ error: "Nežinoma kolekcija" }, 404);
  if (!(await me(request).catch(() => null))) return unauthorized();
  const known = new URL(request.url).searchParams.get("v");
  if (known && known === (await version(col))) return json({ v: known, same: true });
  return json(await list(col));
}
