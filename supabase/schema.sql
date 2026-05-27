create table if not exists public.tasks (
  id uuid primary key,
  title text not null,
  completed boolean not null default false,
  priority text not null default 'Focus',
  time text not null default '9:00 AM',
  due_date date not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists time text not null default '9:00 AM';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;

create trigger set_tasks_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;

create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.push_subscriptions enable row level security;

alter table public.tasks replica identity full;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

drop policy if exists "Allow public task access" on public.tasks;
drop policy if exists "Allow public push subscription insert" on public.push_subscriptions;
drop policy if exists "Allow public push subscription update" on public.push_subscriptions;

create policy "Allow public task access"
on public.tasks
for all
to anon
using (true)
with check (true);

create policy "Allow public push subscription insert"
on public.push_subscriptions
for insert
to anon
with check (true);

create policy "Allow public push subscription update"
on public.push_subscriptions
for update
to anon
using (true)
with check (true);
