import type { Me } from "./session";
import { get, type Collection } from "./store";

export async function isManager(u: Me): Promise<boolean> {
  if (u.owner) return true;
  const t = await get(u.ws, "team", u.id);
  return t?.role === "manager";
}

/**
 * Everyone signed in may read and write the shared data, like the artifact did.
 * Two limits: deleting needs a manager, and only a manager may change someone's role or commission.
 */
export async function checkWrite(u: Me, col: Collection, id: string, data: Record<string, unknown>) {
  if (col !== "team") return data;
  if (await isManager(u)) return data;
  if (id !== u.id) throw new Error("FORBIDDEN");
  const prev = await get(u.ws, "team", id);
  return { ...data, role: prev?.role === "manager" ? "manager" : "caller", commission: prev?.commission ?? data.commission ?? 10 };
}
