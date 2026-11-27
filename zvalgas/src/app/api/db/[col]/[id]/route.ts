import { checkWrite, isManager } from "@/lib/rules";
import { json, me, unauthorized } from "@/lib/session";
import { isCollection, patch, put, remove, validId } from "@/lib/store";

type Ctx = { params: Promise<{ col: string; id: string }> };
const MAX = 64 * 1024;

async function target(request: Request, ctx: Ctx) {
  const { col, id } = await ctx.params;
  if (!isCollection(col) || !validId(id)) return { error: json({ error: "Blogas adresas" }, 404) } as const;
  const u = await me(request).catch(() => null);
  if (!u) return { error: unauthorized() } as const;
  return { col, id, u } as const;
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > MAX) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if ("error" in t) return t.error;
  const data = await body(request);
  if (!data) return json({ error: "Blogi duomenys", code: "invalid_argument" }, 400);
  try {
    await put(t.col, t.id, await checkWrite(t.u, t.col, t.id, data));
  } catch (e) {
    if ((e as Error).message === "FORBIDDEN") return json({ error: "Neturi teisės", code: "invalid_argument" }, 403);
    throw e;
  }
  return json({ ok: true });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if ("error" in t) return t.error;
  const data = await body(request);
  if (!data) return json({ error: "Blogi duomenys", code: "invalid_argument" }, 400);
  if (t.col === "team" && !(await isManager(t.u)) && t.id !== t.u.id) return json({ error: "Neturi teisės", code: "invalid_argument" }, 403);
  const fields = { ...data };
  if (t.col === "team" && !(await isManager(t.u))) {
    delete fields.role;
    delete fields.commission;
  }
  const next = await patch(t.col, t.id, fields);
  if (!next) return json({ error: "Nerasta", code: "not_found" }, 404);
  return json({ ok: true, data: next });
}

export async function DELETE(request: Request, ctx: Ctx) {
  const t = await target(request, ctx);
  if ("error" in t) return t.error;
  if (!(await isManager(t.u))) return json({ error: "Trinti gali tik vadovas", code: "invalid_argument" }, 403);
  await remove(t.col, t.id);
  return new Response(null, { status: 204 });
}
