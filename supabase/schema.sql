-- D-Tracker schema. Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.
--
-- Security model: Row Level Security is ON for every table and there are NO policies,
-- so the publishable (anon) key can read or write nothing. Only the Next.js server,
-- using SUPABASE_SECRET_KEY (which bypasses RLS), touches this data, and it only does
-- so for a device that has entered APP_PASSCODE.

-- ---------- Cycle tracking ----------

create table if not exists public.periods (
  start       date primary key,
  "end"       date check ("end" is null or "end" >= start),
  updated_at  timestamptz not null default now()
);

create table if not exists public.day_logs (
  day         date primary key,
  pain        smallint check (pain between 0 and 10),
  moods       text[] not null default '{}',
  updated_at  timestamptz not null default now()
);

-- One row (id = 1): cycle settings and small stats.
create table if not exists public.app_settings (
  id                 smallint primary key default 1 check (id = 1),
  cycle_length       smallint not null default 28 check (cycle_length between 15 and 60),
  period_length      smallint not null default 5 check (period_length between 1 and 15),
  treats_opened      integer  not null default 0,
  best_crush_score   integer  not null default 0,
  jarvis_introduced  boolean  not null default false,
  updated_at         timestamptz not null default now()
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------- Jarvis ----------

-- What she sees in the Jarvis tab (her messages, replies, tool steps, date plans…).
create table if not exists public.jarvis_messages (
  id          text primary key,
  seq         bigint generated always as identity,
  kind        text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists jarvis_messages_seq_idx on public.jarvis_messages (seq);

-- One row (id = 1): the conversation as Gemini sees it (kept by the server).
create table if not exists public.jarvis_history (
  id          smallint primary key default 1 check (id = 1),
  contents    jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.jarvis_history (id) values (1) on conflict (id) do nothing;

-- ---------- Glow (makeup assistant) ----------

-- One row (id = 1): her beauty profile, used to personalize suggestions.
create table if not exists public.glow_profile (
  id          smallint primary key default 1 check (id = 1),
  profile     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.glow_profile (id) values (1) on conflict (id) do nothing;

-- Looks she saved for later.
create table if not exists public.glow_looks (
  id          text primary key,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ---------- Keep updated_at fresh ----------

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['periods', 'day_logs', 'app_settings', 'jarvis_history', 'glow_profile'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Lock it down ----------

alter table public.periods          enable row level security;
alter table public.day_logs         enable row level security;
alter table public.app_settings     enable row level security;
alter table public.jarvis_messages  enable row level security;
alter table public.jarvis_history   enable row level security;
alter table public.glow_profile     enable row level security;
alter table public.glow_looks       enable row level security;
-- (Intentionally no policies: anon/authenticated roles get nothing.)
