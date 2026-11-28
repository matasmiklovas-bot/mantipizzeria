import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getUser, getWorkspace, isOwner, MAIN_WS, type User } from "./store";

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

/** owner: owns this workspace. admin: owns "main", so runs the platform (the AI key every team uses). */
export type Me = User & { owner: boolean; admin: boolean; wsName: string };

/** The signed-in person, or null. */
export async function me(request: Request): Promise<Me | null> {
  const id = readSession(cookieValue(request, SESSION_COOKIE));
  if (!id) return null;
  const u = await getUser(id);
  if (!u || !allowed(u.email)) return null;
  const w = await getWorkspace(u.ws);
  const owner = await isOwner(u, w);
  return { ...u, owner, admin: owner && u.ws === MAIN_WS, wsName: w?.name || "" };
}

export const JOIN_COOKIE = "cl_join";

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

/* ----- passwords (scrypt) ----- */
const SCRYPT = { N: 16384, r: 8, p: 1 };

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 32, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export function checkPassword(pw: string, stored: string): boolean {
  const [kind, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64url");
  const got = scryptSync(pw, Buffer.from(salt, "base64url"), want.length, SCRYPT);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function sessionCookie(request: Request, userId: string): string {
  return `${SESSION_COOKIE}=${createSession(userId)}; Max-Age=${SESSION_DAYS * 86400}; Path=/; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}`;
}

export const secure = (request: Request) => new URL(request.url).protocol === "https:";
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export const unauthorized = () => json({ error: "Reikia prisijungti", code: "unauthenticated" }, 401);
