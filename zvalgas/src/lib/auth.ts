import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "zv_session";
export const SESSION_DAYS = 30;

function secret(): string | null {
  const pw = process.env.APP_PASSWORD;
  return pw ? `zvalgas:${pw}` : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function createSession(name: string): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const payload = `${Buffer.from(name, "utf8").toString("base64url")}.${exp}`;
  return `${payload}.${sign(payload, key)}`;
}

/** Returns the signed-in person's name, or null. */
export function readSession(value: string | undefined | null): string | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [n, exp, sig] = parts;
  const expected = Buffer.from(sign(`${n}.${exp}`, key));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  if (!(Number(exp) > Date.now())) return null;
  const name = Buffer.from(n, "base64url").toString("utf8").trim();
  return name || null;
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return false;
  const a = createHmac("sha256", "cmp").update(input).digest();
  const b = createHmac("sha256", "cmp").update(pw).digest();
  return timingSafeEqual(a, b);
}

/** Reads the user from a route handler request. */
export function userFrom(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  return readSession(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null);
}

export const unauthorized = () => Response.json({ error: "Reikia prisijungti" }, { status: 401 });
