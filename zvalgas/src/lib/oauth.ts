export const OAUTH_COOKIE = "cl_oauth";

export function baseUrl(request: Request): string {
  const fixed = process.env.APP_URL?.replace(/\/+$/, "");
  if (fixed) return fixed;
  const u = new URL(request.url);
  return `${u.protocol}//${u.host}`;
}

export const redirectUri = (request: Request) => `${baseUrl(request)}/api/auth/callback`;

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** What is still missing on the server, in plain words, for the login page. */
export function missingConfig(): string[] {
  const m: string[] = [];
  if (!(process.env.DATABASE_URL || process.env.POSTGRES_URL)) m.push("DATABASE_URL (Vercel → Storage → Neon)");
  if (!process.env.GOOGLE_CLIENT_ID) m.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) m.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) m.push("AUTH_SECRET (bent 16 simbolių)");
  return m;
}
