export const STATUSES = [
  { id: "new", label: "Neskambinta", short: "Neskambinta", color: "var(--s-new)" },
  { id: "no_answer", label: "Skambinta — neatsiliepė", short: "Neatsiliepė", color: "var(--s-no-answer)" },
  { id: "declined", label: "Skambinta — nenori", short: "Nenori", color: "var(--s-declined)" },
  { id: "thinking", label: "Skambinta — pagalvos", short: "Pagalvos", color: "var(--s-thinking)" },
  { id: "interested", label: "Skambinta — nori", short: "Nori", color: "var(--s-interested)" },
] as const;

export type StatusId = (typeof STATUSES)[number]["id"];

export const statusById = (id: StatusId) => STATUSES.find((s) => s.id === id) ?? STATUSES[0];

export const NEEDS = [
  "Svetainė",
  "Svetainės atnaujinimas",
  "Rezervacijų sistema",
  "El. parduotuvė",
  "Vidinė sistema / CRM",
] as const;

export type Need = (typeof NEEDS)[number];

export const REVENUE_BRACKETS = [
  { id: "lt50k", label: "iki 50 tūkst. €" },
  { id: "50-150k", label: "50–150 tūkst. €" },
  { id: "150-500k", label: "150–500 tūkst. €" },
  { id: "500k-1m", label: "0,5–1 mln. €" },
  { id: "1-5m", label: "1–5 mln. €" },
  { id: "gt5m", label: "5 mln. € +" },
] as const;

export type RevenueId = (typeof REVENUE_BRACKETS)[number]["id"];

/** Fields the AI search returns for each business. */
export interface FoundLead {
  name: string;
  companyCode: string;
  category: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  revenue: string;
  need: Need;
  reason: string;
  source: string;
}

export interface Lead extends FoundLead {
  id: string;
  status: StatusId;
  note: string;
  createdAt: number;
  updatedAt: number;
  /** True until the user touches the lead (status change / note). */
  fresh: boolean;
}

export interface SearchRequest {
  industry: string;
  city: string;
  revenue: RevenueId[];
  needs: Need[];
  count: number;
  exclude: string[];
}

export type SearchEvent =
  | { type: "search"; query: string }
  | { type: "fetch"; url: string }
  | { type: "leads"; leads: FoundLead[] }
  | { type: "error"; message: string }
  | { type: "done" };
