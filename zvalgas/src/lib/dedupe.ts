import type { LeadInput } from "./types";

type Key = Pick<LeadInput, "name" | "phone" | "companyCode">;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(uab|mb|ii|ab|vsi|iv|pi)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const phoneKey = (s: string) => s.replace(/\D/g, "").slice(-8);

export function sameBusiness(a: Key, b: Key): boolean {
  if (a.companyCode && b.companyCode && a.companyCode === b.companyCode) return true;
  const pa = phoneKey(a.phone);
  if (pa.length === 8 && pa === phoneKey(b.phone)) return true;
  const na = norm(a.name);
  return na.length > 2 && na === norm(b.name);
}

/** Splits candidates into new ones and duplicates (of existing rows or of each other). */
export function withoutDuplicates<T extends Key>(candidates: T[], existing: Key[]): { fresh: T[]; dupes: number } {
  const seen: Key[] = [...existing];
  const fresh: T[] = [];
  for (const c of candidates) {
    if (seen.some((s) => sameBusiness(s, c))) continue;
    seen.push(c);
    fresh.push(c);
  }
  return { fresh, dupes: candidates.length - fresh.length };
}
