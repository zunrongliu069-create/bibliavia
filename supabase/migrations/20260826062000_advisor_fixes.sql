revoke all on function public.handle_new_user() from public, anon, authenticated;
drop function public.claim_reward(uuid, text);

create function public.claim_reward_for_user(p_user_id uuid, p_request_id uuid, p_reward_key text)
returns public.economy_balances language plpgsql set search_path = '' as $$
declare reward jsonb; result public.economy_balances;
begin
  reward := case p_reward_key
    when 'first_lesson' then '{"gold":25}'::jsonb
    when 'seven_day_streak' then '{"gold":100,"streak_freezes":1}'::jsonb
    when 'mastery_milestone' then '{"character_shards":10}'::jsonb
    else null end;
  if reward is null then raise exception 'Unknown reward'; end if;
  insert into public.economy_events (id,user_id,request_id,event_key,gold_delta,character_shards_delta,wild_shards_delta,streak_freezes_delta)
  values (gen_random_uuid(),p_user_id,p_request_id,p_reward_key,coalesce((reward->>'gold')::int,0),coalesce((reward->>'character_shards')::int,0),coalesce((reward->>'wild_shards')::int,0),coalesce((reward->>'streak_freezes')::int,0))
  on conflict do nothing;
  if found then
    update public.economy_balances set
      gold = gold + coalesce((reward->>'gold')::int,0),
      character_shards = character_shards + coalesce((reward->>'character_shards')::int,0),
      wild_shards = wild_shards + coalesce((reward->>'wild_shards')::int,0),
      streak_freezes = streak_freezes + coalesce((reward->>'streak_freezes')::int,0)
    where user_id = p_user_id;
  end if;
  select * into result from public.economy_balances where user_id = p_user_id;
  return result;
end;
$$;
revoke all on function public.claim_reward_for_user(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_reward_for_user(uuid, uuid, text) to service_role;

create index reading_plans_user_id_idx on public.reading_plans (user_id);
create index review_events_memorization_id_idx on public.review_events (memorization_id);
