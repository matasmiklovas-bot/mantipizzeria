-- Portrait shop schema for Supabase (Postgres).
-- Run once: Supabase dashboard -> SQL Editor -> paste this file -> Run.
-- Safe to run again: every statement is "if not exists".
--
-- Access model: the website talks to the database only from the server, with
-- the service role key. Row level security is enabled with no policies, so
-- the public (anon) key cannot read or write anything.

create table if not exists orders (
  id uuid primary key,
  code text not null unique,
  token text not null unique,
  status text not null check (status in (
    'laukia_apmokejimo','apmoketa','kuriama','laukia_patvirtinimo','taisoma',
    'patvirtinta','spaudoje','issiusta','atsaukta')),
  created_at timestamptz not null,
  updated_at timestamptz not null,

  style text not null,
  size text not null,
  frame text not null,
  name text not null,
  second_line text not null default '',

  customer_name text not null,
  email text not null,
  phone text not null,
  delivery_network text not null,
  delivery_city text not null,
  delivery_address text not null,

  price_cents integer not null check (price_cents > 0),
  after_christmas boolean not null default false,
  estimated_delivery date,
  terms_accepted_at timestamptz not null,

  payment_ref text,
  paid_at timestamptz,
  confirmation_sent_at timestamptz,

  photo_key text,
  photo_width integer,
  photo_height integer,

  portrait_version integer not null default 0,
  portrait_key text,
  preview_key text,
  clean_key text,
  wall_key text,
  print_key text,
  render_report jsonb,
  preview_sent_at timestamptz,

  approved_version integer,
  approved_at timestamptz,
  revision_count integer not null default 0,
  revision_notes jsonb not null default '[]'::jsonb,

  tracking_number text,
  shipped_at timestamptz,
  files_purged_at timestamptz
);

create index if not exists orders_status_idx on orders (status, created_at desc);

create table if not exists order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders (id) on delete cascade,
  at timestamptz not null default now(),
  type text not null,
  data jsonb not null default '{}'::jsonb
);

create index if not exists order_events_order_idx on order_events (order_id, at);

-- One row per payment notification. The primary key is what makes a repeated
-- notification detectable.
create table if not exists payment_events (
  event_id text primary key,
  order_id uuid references orders (id) on delete set null,
  type text not null,
  at timestamptz not null default now()
);

create table if not exists photos (
  id uuid primary key,
  raw_key text,
  key text,
  status text not null check (status in ('pending','ready')),
  order_id uuid references orders (id) on delete set null,
  created_at timestamptz not null,
  width integer,
  height integer,
  warnings jsonb not null default '[]'::jsonb
);

create index if not exists photos_orphans_idx on photos (created_at) where order_id is null;

-- Cookieless visit counter: no IP address, no user identifier.
create table if not exists site_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  name text not null,
  path text,
  ref text,
  source text
);

create index if not exists site_events_at_idx on site_events (at);

alter table orders enable row level security;
alter table order_events enable row level security;
alter table payment_events enable row level security;
alter table photos enable row level security;
alter table site_events enable row level security;

-- Private bucket for customer photos and portrait files: 15 MB per file,
-- not public, so no file has a public URL.
insert into storage.buckets (id, name, public, file_size_limit)
values ('portretai', 'portretai', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;
