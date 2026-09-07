-- Jinder: jobs table + realtime
-- Run this in the Supabase SQL editor (or via `supabase db push`)

create extension if not exists "pgcrypto";

create table if not exists public.jobs (
  id             uuid primary key default gen_random_uuid(),
  source         text not null,
  external_id    text not null,
  title          text not null,
  company        text not null,
  company_logo   text,
  location       text,
  country        text not null check (country in ('CA', 'US')),
  is_remote      boolean not null default false,
  job_type       text not null default 'full-time' check (job_type in ('full-time', 'part-time', 'contract')),
  url            text not null,
  description    text,
  tags           text[] not null default '{}',
  salary_min     integer,
  salary_max     integer,
  posted_at      timestamptz not null,
  discovered_at  timestamptz not null default now(),

  constraint jobs_source_external_id_key unique (source, external_id)
);

-- Common query patterns: latest jobs, filter by country/type/remote, keyword search
create index if not exists jobs_posted_at_idx on public.jobs (posted_at desc);
create index if not exists jobs_country_idx on public.jobs (country);
create index if not exists jobs_job_type_idx on public.jobs (job_type);
create index if not exists jobs_is_remote_idx on public.jobs (is_remote);
create index if not exists jobs_tags_idx on public.jobs using gin (tags);
create index if not exists jobs_title_trgm_idx on public.jobs using gin (title gin_trgm_ops);

create extension if not exists pg_trgm;

-- Row Level Security: public read-only feed, writes only via service role (worker)
alter table public.jobs enable row level security;

create policy "Public can read jobs"
  on public.jobs
  for select
  using (true);

-- No insert/update/delete policies for anon/authenticated -> only the
-- service_role key (used by the worker) can write, since it bypasses RLS.

-- Enable realtime so the frontend can subscribe to INSERTs
alter publication supabase_realtime add table public.jobs;
