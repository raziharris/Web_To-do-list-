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

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;

create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "Allow public push subscription insert" on public.push_subscriptions;
drop policy if exists "Allow public push subscription update" on public.push_subscriptions;

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
