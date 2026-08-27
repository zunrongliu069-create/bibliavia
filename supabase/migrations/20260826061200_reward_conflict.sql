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
  on conflict do nothing;
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
