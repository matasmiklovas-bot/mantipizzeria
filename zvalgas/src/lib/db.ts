import postgres from "postgres";
import { NEEDS, STATUS_IDS, type Activity, type Lead, type LeadInput, type StatusId, type Stats } from "./types";

type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as { __zvSql?: Sql; __zvSchema?: Promise<void> };

export function dbUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function client(): Sql {
  if (g.__zvSql) return g.__zvSql;
  const url = dbUrl();
  if (!url) throw new Error("NO_DATABASE");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  g.__zvSql = postgres(url, {
    ssl: local ? false : "require",
    max: 3,
    idle_timeout: 20,
    prepare: false, // required by poolers such as Neon's pgbouncer endpoint
    onnotice: () => {}, // "already exists, skipping" notices from the schema check
  });
  return g.__zvSql;
}

async function ensureSchema(sql: Sql) {
  g.__zvSchema ??= (async () => {
    await sql`
      create table if not exists leads (
        id text primary key,
        name text not null,
        company_code text not null default '',
        category text not null default '',
        city text not null default '',
        phone text not null default '',
        email text not null default '',
        website text not null default '',
        revenue text not null default '',
        need text not null default 'Svetainė',
        reason text not null default '',
        source text not null default '',
        status text not null default 'new',
        callback_at timestamptz,
        attempts int not null default 0,
        last_called_at timestamptz,
        last_called_by text,
        created_by text not null default '',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
    await sql`
      create table if not exists activities (
        id bigserial primary key,
        lead_id text not null references leads(id) on delete cascade,
        author text not null,
        kind text not null,
        status text,
        note text not null default '',
        created_at timestamptz not null default now()
      )`;
    await sql`create index if not exists activities_lead_idx on activities (lead_id, created_at)`;
    await sql`create index if not exists activities_created_idx on activities (created_at)`;
  })().catch((e) => {
    g.__zvSchema = undefined;
    throw e;
  });
  return g.__zvSchema;
}

export async function db(): Promise<Sql> {
  const sql = client();
  await ensureSchema(sql);
  return sql;
}

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

function toLead(r: Row): Lead {
  return {
    id: String(r.id),
    name: String(r.name),
    companyCode: String(r.company_code),
    category: String(r.category),
    city: String(r.city),
    phone: String(r.phone),
    email: String(r.email),
    website: String(r.website),
    revenue: String(r.revenue),
    need: ((NEEDS as readonly string[]).includes(String(r.need)) ? r.need : "Svetainė") as Lead["need"],
    reason: String(r.reason),
    source: String(r.source),
    status: ((STATUS_IDS as string[]).includes(String(r.status)) ? r.status : "new") as StatusId,
    callbackAt: iso(r.callback_at),
    attempts: Number(r.attempts) || 0,
    lastCalledAt: iso(r.last_called_at),
    lastCalledBy: r.last_called_by ? String(r.last_called_by) : null,
    createdBy: String(r.created_by),
    createdAt: iso(r.created_at)!,
    updatedAt: iso(r.updated_at)!,
  };
}

function toActivity(r: Row): Activity {
  return {
    id: Number(r.id),
    leadId: String(r.lead_id),
    author: String(r.author),
    kind: String(r.kind) as Activity["kind"],
    status: r.status ? (String(r.status) as StatusId) : null,
    note: String(r.note),
    createdAt: iso(r.created_at)!,
  };
}

export async function listLeads(): Promise<Lead[]> {
  const sql = await db();
  const rows = await sql`select * from leads order by created_at desc limit 5000`;
  return rows.map(toLead);
}

export async function getLead(id: string): Promise<Lead | null> {
  const sql = await db();
  const [r] = await sql`select * from leads where id = ${id}`;
  return r ? toLead(r) : null;
}

export async function existingKeys() {
  const sql = await db();
  const rows = await sql`select name, phone, company_code from leads`;
  return rows.map((r) => ({ name: String(r.name), phone: String(r.phone), companyCode: String(r.company_code) }));
}

export async function insertLeads(items: (LeadInput & { id?: string; status?: StatusId; note?: string })[], author: string) {
  if (!items.length) return [] as Lead[];
  const sql = await db();
  const out: Lead[] = [];
  await sql.begin(async (tx) => {
    for (const it of items) {
      const id = it.id && /^[\w-]{1,64}$/.test(it.id) ? it.id : crypto.randomUUID();
      const status = it.status && (STATUS_IDS as string[]).includes(it.status) ? it.status : "new";
      const [r] = await tx`
        insert into leads (id, name, company_code, category, city, phone, email, website, revenue, need, reason, source, status, created_by)
        values (${id}, ${it.name}, ${it.companyCode}, ${it.category}, ${it.city}, ${it.phone}, ${it.email}, ${it.website},
                ${it.revenue}, ${it.need}, ${it.reason}, ${it.source}, ${status}, ${author})
        on conflict (id) do nothing
        returning *`;
      if (!r) continue;
      await tx`insert into activities (lead_id, author, kind, note) values (${id}, ${author}, 'created', '')`;
      if (it.note?.trim()) {
        await tx`insert into activities (lead_id, author, kind, note) values (${id}, ${author}, 'note', ${it.note.trim()})`;
      }
      out.push(toLead(r));
    }
  });
  return out;
}

/** Records a call outcome: updates the lead and appends to its thread. */
export async function logCall(id: string, author: string, status: StatusId, note: string, callbackAt: string | null) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [r] = await tx`
      update leads set
        status = ${status},
        callback_at = ${callbackAt},
        attempts = attempts + 1,
        last_called_at = now(),
        last_called_by = ${author},
        updated_at = now()
      where id = ${id}
      returning *`;
    if (!r) return null;
    const [a] = await tx`
      insert into activities (lead_id, author, kind, status, note)
      values (${id}, ${author}, 'call', ${status}, ${note})
      returning *`;
    return { lead: toLead(r), activity: toActivity(a) };
  });
}

/** Status change without a call (e.g. fixing a mistake from the contacts table). */
export async function setStatus(id: string, author: string, status: StatusId) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [r] = await tx`
      update leads set status = ${status}, callback_at = case when ${status} = 'thinking' then callback_at else null end, updated_at = now()
      where id = ${id} returning *`;
    if (!r) return null;
    const [a] = await tx`
      insert into activities (lead_id, author, kind, status) values (${id}, ${author}, 'status', ${status}) returning *`;
    return { lead: toLead(r), activity: toActivity(a) };
  });
}

export async function addNote(id: string, author: string, note: string) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [r] = await tx`update leads set updated_at = now() where id = ${id} returning *`;
    if (!r) return null;
    const [a] = await tx`
      insert into activities (lead_id, author, kind, note) values (${id}, ${author}, 'note', ${note}) returning *`;
    return { lead: toLead(r), activity: toActivity(a) };
  });
}

export async function updateLeadFields(id: string, fields: Partial<LeadInput>) {
  const sql = await db();
  const map: Record<keyof LeadInput, string> = {
    name: "name",
    companyCode: "company_code",
    category: "category",
    city: "city",
    phone: "phone",
    email: "email",
    website: "website",
    revenue: "revenue",
    need: "need",
    reason: "reason",
    source: "source",
  };
  const patch: Record<string, string> = {};
  for (const [k, col] of Object.entries(map)) {
    const v = fields[k as keyof LeadInput];
    if (typeof v === "string") patch[col] = v.slice(0, 2000);
  }
  if (!Object.keys(patch).length) return getLead(id);
  const [r] = await sql`update leads set ${sql(patch)}, updated_at = now() where id = ${id} returning *`;
  return r ? toLead(r) : null;
}

export async function deleteLead(id: string) {
  const sql = await db();
  await sql`delete from leads where id = ${id}`;
}

export async function listActivities(leadId: string): Promise<Activity[]> {
  const sql = await db();
  const rows = await sql`select * from activities where lead_id = ${leadId} order by created_at asc, id asc limit 500`;
  return rows.map(toActivity);
}

export async function stats(): Promise<Stats> {
  const sql = await db();
  const per = (since: string) => sql`
    select author,
           count(*)::int as calls,
           count(*) filter (where status <> 'no_answer')::int as reached,
           count(*) filter (where status = 'interested')::int as interested
    from activities
    where kind = 'call' and created_at >= ${since}::timestamptz
    group by author order by calls desc`;
  // Days are counted in Lithuanian time.
  const [startToday] = await sql`select (date_trunc('day', now() at time zone 'Europe/Vilnius') at time zone 'Europe/Vilnius') as t`;
  const today = await per(new Date(startToday.t as Date).toISOString());
  const week = await per(new Date(Date.now() - 7 * 864e5).toISOString());
  const daily = await sql`
    select to_char(date_trunc('day', created_at at time zone 'Europe/Vilnius'), 'YYYY-MM-DD') as day, count(*)::int as calls
    from activities
    where kind = 'call' and created_at >= now() - interval '14 days'
    group by 1 order by 1`;
  const mapRow = (r: Row) => ({
    author: String(r.author),
    calls: Number(r.calls),
    reached: Number(r.reached),
    interested: Number(r.interested),
  });
  return {
    today: today.map(mapRow),
    week: week.map(mapRow),
    daily: daily.map((r) => ({ day: String(r.day), calls: Number(r.calls) })),
  };
}
