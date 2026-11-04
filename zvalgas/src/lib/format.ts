const TZ = "Europe/Vilnius";

const dayKey = (d: Date) => d.toLocaleDateString("lt-LT", { timeZone: TZ });
const hm = (d: Date) => d.toLocaleTimeString("lt-LT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** "prieš 5 min.", "šiandien 14:30", "vakar 09:10", "rugs. 12 d." */
export function when(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff >= 0 && diff < 60_000) return "ką tik";
  if (diff >= 0 && diff < 3_600_000) return `prieš ${Math.floor(diff / 60_000)} min.`;
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  const tomorrow = new Date(Date.now() + 864e5);
  if (dayKey(d) === dayKey(today)) return `šiandien ${hm(d)}`;
  if (dayKey(d) === dayKey(yest)) return `vakar ${hm(d)}`;
  if (dayKey(d) === dayKey(tomorrow)) return `rytoj ${hm(d)}`;
  return d.toLocaleDateString("lt-LT", { timeZone: TZ, month: "long", day: "numeric" }) + ` ${hm(d)}`;
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function host(url: string) {
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const href = (url: string) => (/^https?:/i.test(url) ? url : `https://${url}`);
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** Stable pleasant color per person, for avatars. */
export function personColor(name: string) {
  const palette = ["#3d6aa3", "#2e7a4e", "#8a5a9e", "#b5432f", "#c08a1e", "#3f7f86", "#6b6b2f"];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
