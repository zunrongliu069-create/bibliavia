create table public.chest_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  base_level smallint not null check (base_level between 1 and 5),
  final_level smallint not null check (final_level between base_level and 5),
  upgrade_taps smallint not null default 0 check (upgrade_taps between 0 and 3),
  rewards jsonb not null check (jsonb_typeof(rewards) = 'array'),
  opened_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.shop_purchase_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  quantity integer not null check (quantity > 0),
  gold_spent integer not null check (gold_spent >= 0),
  purchased_at timestamptz not null default now()
);

alter table public.chest_events enable row level security;
alter table public.shop_purchase_events enable row level security;

create policy chest_events_select on public.chest_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy shop_purchase_events_select on public.shop_purchase_events for select to authenticated
  using ((select auth.uid()) = user_id);

create index chest_events_user_opened_idx on public.chest_events (user_id, opened_at desc);
create index shop_purchase_events_user_date_idx on public.shop_purchase_events (user_id, purchased_at desc);

grant select on public.chest_events, public.shop_purchase_events to authenticated;
