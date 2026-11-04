import { when } from "./format";
import type { Lead } from "./types";

export type QueueTab = "queue" | "waiting" | "won";

/** A "no answer" lead comes back into the queue after this long. */
export const RETRY_AFTER_MS = 3 * 3600_000;

export interface Placed {
  lead: Lead;
  tab: QueueTab;
  /** Lower sorts first. */
  rank: number;
  sortKey: number;
  label: string;
  tone: "accent" | "blue" | "amber" | "green" | "muted";
}

export function place(l: Lead, now = Date.now()): Placed | null {
  const t = (s: string | null) => (s ? Date.parse(s) : 0);
  switch (l.status) {
    case "interested":
      return { lead: l, tab: "won", rank: 0, sortKey: -t(l.updatedAt), label: "Nori", tone: "green" };
    case "declined":
      return null;
    case "thinking": {
      const due = t(l.callbackAt);
      if (!due || due <= now)
        return { lead: l, tab: "queue", rank: 0, sortKey: due, label: "Perskambinti dabar", tone: "blue" };
      return { lead: l, tab: "waiting", rank: 0, sortKey: due, label: `Perskambinti ${when(l.callbackAt)}`, tone: "blue" };
    }
    case "no_answer": {
      const last = t(l.lastCalledAt);
      const label = `Neatsiliepė ×${l.attempts}`;
      if (now - last >= RETRY_AFTER_MS) return { lead: l, tab: "queue", rank: 2, sortKey: last, label, tone: "amber" };
      return {
        lead: l,
        tab: "waiting",
        rank: 1,
        sortKey: last + RETRY_AFTER_MS,
        label: `Bandyti vėl ${when(new Date(last + RETRY_AFTER_MS).toISOString())}`,
        tone: "amber",
      };
    }
    default:
      return { lead: l, tab: "queue", rank: 1, sortKey: -t(l.createdAt), label: "Naujas", tone: "accent" };
  }
}

export function buildQueues(leads: Lead[], now = Date.now()) {
  const out: Record<QueueTab, Placed[]> = { queue: [], waiting: [], won: [] };
  for (const l of leads) {
    const p = place(l, now);
    if (p) out[p.tab].push(p);
  }
  for (const k of Object.keys(out) as QueueTab[]) {
    out[k].sort((a, b) => a.rank - b.rank || a.sortKey - b.sortKey);
  }
  return out;
}

export const toneColor: Record<Placed["tone"], string> = {
  accent: "var(--accent)",
  blue: "var(--s-thinking)",
  amber: "var(--s-no-answer)",
  green: "var(--s-interested)",
  muted: "var(--muted)",
};
