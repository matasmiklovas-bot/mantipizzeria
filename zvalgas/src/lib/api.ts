import { NEEDS, type LeadInput, type Need } from "./types";

/** Wraps a route handler body: turns a missing database into a readable 503. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error && err.message === "NO_DATABASE") {
      return Response.json(
        { error: "Nėra prijungtos duomenų bazės (DATABASE_URL). Vercel: Storage → Neon → Connect." },
        { status: 503 },
      );
    }
    console.error(err);
    return Response.json({ error: "Serverio klaida" }, { status: 500 });
  }
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates loosely-typed input (form, import, AI) into a LeadInput, or null if unusable. */
export function cleanLead(raw: unknown): LeadInput | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 200);
  if (!name) return null;
  const need = str(r.need);
  return {
    name,
    companyCode: str(r.companyCode, 40),
    category: str(r.category, 120),
    city: str(r.city, 120),
    phone: str(r.phone, 60),
    email: str(r.email, 200),
    website: str(r.website, 300),
    revenue: str(r.revenue, 120),
    need: ((NEEDS as readonly string[]).includes(need) ? need : "Svetainė") as Need,
    reason: str(r.reason, 1000),
    source: str(r.source, 500),
  };
}
