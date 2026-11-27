import { createHmac, timingSafeEqual } from "node:crypto";
import { getUser, isOwner, type User } from "./store";

export const SESSION_COOKIE = "cl_session";
export const SESSION_DAYS = 30;

function key(): string | null {
  const s = process.env.AUTH_SECRET;
  return s && s.length >= 16 ? s : null;
}

const sign = (payload: string, k: string) => createHmac("sha256", k).update(payload).digest("base64url");

export function createSession(userId: string): string {
  const k = key();
  if (!k) throw new Error("NO_AUTH_SECRET");
  const payload = `${Buffer.from(userId, "utf8").toString("base64url")}.${Date.now() + SESSION_DAYS * 864e5}`;
  return `${payload}.${sign(payload, k)}`;
}

export function readSession(value: string | undefined | null): string | null {
  const k = key();
  if (!k || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const want = Buffer.from(sign(`${id}.${exp}`, k));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  if (!(Number(exp) > Date.now())) return null;
  return Buffer.from(id, "base64url").toString("utf8") || null;
}

export function cookieValue(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const hit = raw.split(/;\s*/).find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

export type Me = User & { owner: boolean };

/** The signed-in person, or null. */
export async function me(request: Request): Promise<Me | null> {
  const id = readSession(cookieValue(request, SESSION_COOKIE));
  if (!id) return null;
  const u = await getUser(id);
  if (!u || !allowed(u.email)) return null;
  return { ...u, owner: await isOwner(u) };
}

/** ALLOWED_EMAILS: comma list of addresses or @domains. Empty means anyone with a Google account. */
export function allowed(email: string): boolean {
  const list = (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return true;
  const e = email.toLowerCase();
  return list.some((a) => (a.startsWith("@") ? e.endsWith(a) : e === a));
}

export const secure = (request: Request) => new URL(request.url).protocol === "https:";
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const unauthorized = () => json({ error: "Reikia prisijungti", code: "unauthenticated" }, 401);
