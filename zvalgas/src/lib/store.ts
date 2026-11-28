import { randomBytes } from "node:crypto";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
const g = globalThis as unknown as { __clSql?: Sql; __clSchema?: Promise<void> };

export const COLLECTIONS = ["leads", "activities", "deals", "team", "meta"] as const;
export type Collection = (typeof COLLECTIONS)[number];
export const isCollection = (c: string): c is Collection => (COLLECTIONS as readonly string[]).includes(c);
export const validId = (id: string) => /^[\w.-]{1,100}$/.test(id);

/** Each team has its own workspace. Data from before workspaces existed belongs to "main" (the platform owner's team). */
export const MAIN_WS = "main";
const token = () => randomBytes(12).toString("base64url");

export function dbUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function client(): Sql {
  if (g.__clSql) return g.__clSql;
  const url = dbUrl();
  if (!url) throw new Error("NO_DATABASE");
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  g.__clSql = postgres(url, {
    ssl: local ? false : "require",
    max: 3,
    idle_timeout: 20,
    prepare: false, // needed behind poolers such as Neon's pgbouncer endpoint
    onnotice: () => {},
  });
  return g.__clSql;
}

export async function db(): Promise<Sql> {
  const sql = client();
  g.__clSchema ??= (async () => {
    await sql`create table if not exists cl_users (
      id text primary key,
      email text not null default '',
      name text not null default '',
      avatar text not null default '',
      created_at timestamptz not null default now(),
      last_seen timestamptz not null default now())`;
    await sql`alter table cl_users add column if not exists username text`;
    await sql`alter table cl_users add column if not exists pass_hash text`;
    await sql`create unique index if not exists cl_users_username on cl_users (username)`;
    await sql`create table if not exists cl_docs (
      ws text not null default 'main',
      col text not null,
      id text not null,
      data jsonb not null,
      version int not null default 1,
      updated_at timestamptz not null default now())`;
    await sql`create table if not exists cl_versions (ws text not null default 'main', col text not null, v bigint not null default 0)`;
    // Workspaces: existing rows land in "main"; keys become (ws, col, id).
    await sql`alter table cl_users add column if not exists ws text not null default 'main'`;
    await sql`alter table cl_docs add column if not exists ws text not null default 'main'`;
    await sql`alter table cl_docs drop constraint if exists cl_docs_pkey`;
    await sql`create unique index if not exists cl_docs_key on cl_docs (ws, col, id)`;
    await sql`alter table cl_versions add column if not exists ws text not null default 'main'`;
    await sql`alter table cl_versions drop constraint if exists cl_versions_pkey`;
    await sql`create unique index if not exists cl_versions_key on cl_versions (ws, col)`;
    await sql`create table if not exists cl_workspaces (
      id text primary key,
      name text not null default '',
      owner text not null default '',
      invite text not null,
      created_at timestamptz not null default now())`;
    await sql`create unique index if not exists cl_workspaces_invite on cl_workspaces (invite)`;
    await sql`insert into cl_workspaces (id, name, owner, invite) values (${MAIN_WS}, 'Coldai', '', ${token()}) on conflict (id) do nothing`;
    // Server-only values (API keys). Never exposed through /api/db.
    await sql`create table if not exists cl_secrets (k text primary key, v text not null, updated_at timestamptz not null default now())`;
  })().catch((e) => {
    g.__clSchema = undefined;
    throw e;
  });
  await g.__clSchema;
  return sql;
}

export type Doc = { id: string; data: Record<string, unknown> };

export async function version(ws: string, col: Collection): Promise<string> {
  const sql = await db();
  const [r] = await sql`select v from cl_versions where ws = ${ws} and col = ${col}`;
  return String(r?.v ?? 0);
}

export async function list(ws: string, col: Collection): Promise<{ v: string; docs: Doc[] }> {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [r] = await tx`select v from cl_versions where ws = ${ws} and col = ${col}`;
    const rows = await tx`select id, data from cl_docs where ws = ${ws} and col = ${col}`;
    return { v: String(r?.v ?? 0), docs: rows.map((x) => ({ id: String(x.id), data: x.data as Record<string, unknown> })) };
  });
}

export async function get(ws: string, col: Collection, id: string): Promise<Record<string, unknown> | null> {
  const sql = await db();
  const [r] = await sql`select data from cl_docs where ws = ${ws} and col = ${col} and id = ${id}`;
  return r ? (r.data as Record<string, unknown>) : null;
}

const bump = (tx: postgres.TransactionSql, ws: string, col: Collection) =>
  tx`insert into cl_versions (ws, col, v) values (${ws}, ${col}, 1) on conflict (ws, col) do update set v = cl_versions.v + 1`;

export async function put(ws: string, col: Collection, id: string, data: Record<string, unknown>) {
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`insert into cl_docs (ws, col, id, data) values (${ws}, ${col}, ${id}, ${tx.json(data as postgres.JSONValue)})
      on conflict (ws, col, id) do update set data = excluded.data, version = cl_docs.version + 1, updated_at = now()`;
    await bump(tx, ws, col);
  });
}

/** Shallow merge, like a document update. */
export async function patch(ws: string, col: Collection, id: string, fields: Record<string, unknown>) {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [r] = await tx`update cl_docs set data = data || ${tx.json(fields as postgres.JSONValue)}, version = version + 1, updated_at = now()
      where ws = ${ws} and col = ${col} and id = ${id} returning data`;
    if (!r) return null;
    await bump(tx, ws, col);
    return r.data as Record<string, unknown>;
  });
}

export async function remove(ws: string, col: Collection, id: string) {
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`delete from cl_docs where ws = ${ws} and col = ${col} and id = ${id}`;
    await bump(tx, ws, col);
  });
}

export async function putMany(ws: string, col: Collection, docs: Doc[]) {
  if (!docs.length) return;
  const sql = await db();
  await sql.begin(async (tx) => {
    for (const d of docs) {
      await tx`insert into cl_docs (ws, col, id, data) values (${ws}, ${col}, ${d.id}, ${tx.json(d.data as postgres.JSONValue)})
        on conflict (ws, col, id) do nothing`;
    }
    await bump(tx, ws, col);
  });
}

/* ----- workspaces ----- */
export type Workspace = { id: string; name: string; owner: string; invite: string };
const wsRow = (r: postgres.Row): Workspace => ({ id: String(r.id), name: String(r.name), owner: String(r.owner), invite: String(r.invite) });

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const sql = await db();
  const [r] = await sql`select id, name, owner, invite from cl_workspaces where id = ${id}`;
  return r ? wsRow(r) : null;
}

export async function workspaceByInvite(invite: string): Promise<Workspace | null> {
  if (!/^[\w-]{8,64}$/.test(invite)) return null;
  const sql = await db();
  const [r] = await sql`select id, name, owner, invite from cl_workspaces where invite = ${invite}`;
  return r ? wsRow(r) : null;
}

export async function createWorkspace(name: string, owner: string): Promise<Workspace> {
  const sql = await db();
  const id = `w_${randomBytes(8).toString("hex")}`;
  const [r] = await sql`insert into cl_workspaces (id, name, owner, invite) values (${id}, ${name.slice(0, 80)}, ${owner}, ${token()}) returning id, name, owner, invite`;
  return wsRow(r);
}

export async function updateWorkspace(id: string, p: { name?: string; rotate?: boolean }): Promise<Workspace | null> {
  const sql = await db();
  if (p.name !== undefined) await sql`update cl_workspaces set name = ${p.name.slice(0, 80)} where id = ${id}`;
  if (p.rotate) await sql`update cl_workspaces set invite = ${token()} where id = ${id}`;
  return getWorkspace(id);
}

/* ----- people ----- */
export type User = { id: string; email: string; name: string; avatar: string; ws: string };

/** Google sign-in: updates a known person; a new one joins `ws`. */
export async function upsertUser(u: User) {
  const sql = await db();
  await sql`insert into cl_users (id, email, name, avatar, ws) values (${u.id}, ${u.email}, ${u.name}, ${u.avatar}, ${u.ws})
    on conflict (id) do update set email = excluded.email, name = excluded.name, avatar = excluded.avatar, last_seen = now()`;
}

export async function getUser(id: string): Promise<User | null> {
  const sql = await db();
  const [r] = await sql`select id, email, name, avatar, ws from cl_users where id = ${id}`;
  return r ? { id: String(r.id), email: String(r.email), name: String(r.name), avatar: String(r.avatar), ws: String(r.ws || MAIN_WS) } : null;
}

/** Names and pictures of people in the same workspace only. */
export async function profiles(ws: string, ids: string[]) {
  if (!ids.length) return [];
  const sql = await db();
  const rows = await sql`select id, name, avatar from cl_users where id = any(${ids}) and ws = ${ws}`;
  return rows.map((r) => ({ id: String(r.id), name: String(r.name), avatar: String(r.avatar) }));
}

export async function findByUsername(username: string) {
  const sql = await db();
  const [r] = await sql`select id, pass_hash from cl_users where username = ${username}`;
  return r ? { id: String(r.id), hash: r.pass_hash ? String(r.pass_hash) : "" } : null;
}

/** Creates a username/password account. Returns false if the name is taken. */
export async function createPasswordUser(id: string, username: string, name: string, hash: string, ws: string): Promise<boolean> {
  const sql = await db();
  const rows = await sql`insert into cl_users (id, email, name, avatar, username, pass_hash, ws)
    values (${id}, '', ${name}, '', ${username}, ${hash}, ${ws}) on conflict do nothing returning id`;
  return rows.length === 1;
}

/** Moves a just-created person into the workspace made for them. */
export async function setUserWorkspace(id: string, ws: string) {
  const sql = await db();
  await sql`update cl_users set ws = ${ws} where id = ${id}`;
}

/**
 * Owner of a workspace: its recorded owner. For "main" (no recorded owner): OWNER_EMAIL / OWNER_USERNAME if set,
 * otherwise whoever joined it first. The owner of "main" also runs the platform (AI key).
 */
export async function isOwner(u: User, w: Workspace | null): Promise<boolean> {
  if (w?.owner) return w.owner === u.id;
  if (u.ws !== MAIN_WS) return false;
  const owner = (process.env.OWNER_EMAIL || "").trim().toLowerCase();
  if (owner) return u.email.toLowerCase() === owner;
  const ownerName = (process.env.OWNER_USERNAME || "").trim().toLowerCase();
  if (ownerName) return u.id === `u_${ownerName}`;
  const sql = await db();
  const [r] = await sql`select id from cl_users where ws = ${MAIN_WS} order by created_at asc, id asc limit 1`;
  return r?.id === u.id;
}

/* ----- server-only secrets ----- */
export async function getSecret(k: string): Promise<string> {
  const sql = await db();
  const [r] = await sql`select v from cl_secrets where k = ${k}`;
  return r ? String(r.v) : "";
}

export async function setSecret(k: string, v: string | null) {
  const sql = await db();
  if (v === null) await sql`delete from cl_secrets where k = ${k}`;
  else await sql`insert into cl_secrets (k, v) values (${k}, ${v}) on conflict (k) do update set v = excluded.v, updated_at = now()`;
}
