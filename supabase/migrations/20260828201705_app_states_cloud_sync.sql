create table public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

revoke all on table public.app_states from anon;
grant select, insert, update on table public.app_states to authenticated;

create policy "Users can read their own app state"
on public.app_states
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own app state"
on public.app_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own app state"
on public.app_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
