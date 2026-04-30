create table if not exists public.class_sessions (
  code text primary key,
  created_at timestamptz not null default now(),
  noun text,
  tagline text,
  image text,
  sense text,
  prompt text,
  guide text
);

create table if not exists public.class_responses (
  id text primary key,
  session_code text not null references public.class_sessions(code) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  writing text not null,
  noun text,
  sense text,
  prompt text
);

alter table public.class_sessions enable row level security;
alter table public.class_responses enable row level security;

drop policy if exists "Read class sessions by code" on public.class_sessions;
create policy "Read class sessions by code"
on public.class_sessions for select
to anon
using (true);

drop policy if exists "Read class responses by room" on public.class_responses;
create policy "Read class responses by room"
on public.class_responses for select
to anon
using (true);

alter publication supabase_realtime add table public.class_sessions;
alter publication supabase_realtime add table public.class_responses;
