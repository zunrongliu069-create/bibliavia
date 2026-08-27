create unique index economy_events_one_time_reward
  on public.economy_events (user_id, event_key)
  where event_key in ('first_lesson', 'seven_day_streak', 'mastery_milestone');
