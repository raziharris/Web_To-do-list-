create table if not exists public.tasks (
  id uuid primary key,
  title text not null,
  completed boolean not null default false,
  priority text not null default 'Focus',
  due_date date not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.tasks enable row level security;

drop policy if exists "Allow public task access" on public.tasks;

create policy "Allow public task access"
on public.tasks
for all
to anon
using (true)
with check (true);
