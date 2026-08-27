create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'sv', theme text not null default 'system',
  notifications jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  passage_key text not null, progress real not null default 0 check (progress between 0 and 1),
  last_read_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (user_id, passage_key)
);
create table public.reading_plans (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  plan_key text not null, title text not null, state text not null default 'active'
    check (state in ('active','paused','completed')),
  target_date date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.verse_content (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null, kind text not null check (kind in ('highlight','note','saved')),
  body text, color text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.memorization_items (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  verse_key text not null, mastery smallint not null default 0 check (mastery between 0 and 100),
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor real not null default 2.5 check (ease_factor between 1.3 and 4),
  due_at timestamptz not null default now(), last_reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, verse_key)
);
create table public.review_events (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  memorization_id uuid references public.memorization_items(id) on delete set null,
  verse_key text not null, rating smallint not null check (rating between 0 and 5),
  reviewed_at timestamptz not null, device_id text, created_at timestamptz not null default now()
);
create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade, lesson_key text not null,
  completed_steps integer not null default 0 check (completed_steps >= 0),
  total_steps integer not null default 1 check (total_steps > 0),
  xp integer not null default 0 check (xp >= 0), hp integer not null default 5 check (hp >= 0),
  completed_at timestamptz, updated_at timestamptz not null default now(),
  primary key (user_id, lesson_key)
);
create table public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade, activity_date date not null,
  xp integer not null default 0 check (xp >= 0), reviews integer not null default 0 check (reviews >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0), updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);
create table public.economy_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gold integer not null default 0 check (gold >= 0),
  character_shards integer not null default 0 check (character_shards >= 0),
  wild_shards integer not null default 0 check (wild_shards >= 0),
  streak_freezes integer not null default 0 check (streak_freezes >= 0),
  updated_at timestamptz not null default now()
);
create table public.economy_events (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null, event_key text not null,
  gold_delta integer not null default 0, character_shards_delta integer not null default 0,
  wild_shards_delta integer not null default 0, streak_freezes_delta integer not null default 0,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create table public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('booster','character','period')),
  item_key text not null, quantity integer not null default 0 check (quantity >= 0),
  level integer not null default 1 check (level > 0), xp integer not null default 0 check (xp >= 0),
  expires_at timestamptz, updated_at timestamptz not null default now(),
  primary key (user_id, item_type, item_key)
);

create index on public.review_events (user_id, reviewed_at desc);
create index on public.memorization_items (user_id, due_at);
create index on public.verse_content (user_id, verse_key) where deleted_at is null;
create index on public.economy_events (user_id, created_at desc);

do $$ declare t text; begin
  foreach t in array array['profiles','user_settings','reading_progress','reading_plans','verse_content',
    'memorization_items','review_events','lesson_progress','daily_activity','economy_balances',
    'economy_events','user_inventory'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

do $$ declare t text; declare owner_col text; begin
  foreach t in array array['profiles','user_settings','reading_progress','reading_plans','verse_content',
    'memorization_items','lesson_progress','daily_activity','user_inventory'] loop
    owner_col := case when t = 'profiles' then 'id' else 'user_id' end;
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = %I)', t || '_select', t, owner_col);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = %I)', t || '_insert', t, owner_col);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)', t || '_update', t, owner_col, owner_col);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = %I)', t || '_delete', t, owner_col);
  end loop;
end $$;

create policy review_events_select on public.review_events for select to authenticated using ((select auth.uid()) = user_id);
create policy review_events_insert on public.review_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy economy_balances_select on public.economy_balances for select to authenticated using ((select auth.uid()) = user_id);
create policy economy_events_select on public.economy_events for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  insert into public.economy_balances (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$ declare t text; begin
  foreach t in array array['profiles','user_settings','reading_progress','reading_plans','verse_content',
    'memorization_items','lesson_progress','daily_activity','economy_balances','user_inventory'] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

create or replace function public.claim_reward(p_request_id uuid, p_reward_key text)
returns public.economy_balances language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); reward jsonb; result public.economy_balances;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  reward := case p_reward_key
    when 'first_lesson' then '{"gold":25}'::jsonb
    when 'seven_day_streak' then '{"gold":100,"streak_freezes":1}'::jsonb
    when 'mastery_milestone' then '{"character_shards":10}'::jsonb
    else null end;
  if reward is null then raise exception 'Unknown reward'; end if;
  insert into public.economy_events (id,user_id,request_id,event_key,gold_delta,character_shards_delta,wild_shards_delta,streak_freezes_delta)
  values (gen_random_uuid(),uid,p_request_id,p_reward_key,coalesce((reward->>'gold')::int,0),coalesce((reward->>'character_shards')::int,0),coalesce((reward->>'wild_shards')::int,0),coalesce((reward->>'streak_freezes')::int,0))
  on conflict (user_id,request_id) do nothing;
  if found then
    update public.economy_balances set
      gold = gold + coalesce((reward->>'gold')::int,0),
      character_shards = character_shards + coalesce((reward->>'character_shards')::int,0),
      wild_shards = wild_shards + coalesce((reward->>'wild_shards')::int,0),
      streak_freezes = streak_freezes + coalesce((reward->>'streak_freezes')::int,0)
    where user_id = uid;
  end if;
  select * into result from public.economy_balances where user_id = uid;
  return result;
end;
$$;
revoke all on function public.claim_reward(uuid,text) from public;
grant execute on function public.claim_reward(uuid,text) to authenticated;
