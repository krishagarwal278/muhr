-- Create an atomic upsert function for ai_review_counters
-- Usage: select * from public.ai_review_increment(user_uuid, inc_count, inc_cents, day_date, limit_int);

create or replace function public.ai_review_increment(
  p_user uuid,
  p_inc_count int,
  p_inc_cents int,
  p_day date,
  p_limit int
)
returns table(ok boolean, review_count int, estimated_cost_cents int)
language plpgsql
as $$
begin
  insert into public.ai_review_counters (user_id, day, review_count, estimated_cost_cents)
  values (p_user, p_day, p_inc_count, p_inc_cents)
  on conflict (user_id, day) do update
    set review_count = public.ai_review_counters.review_count + excluded.review_count,
        estimated_cost_cents = public.ai_review_counters.estimated_cost_cents + excluded.estimated_cost_cents
  returning review_count, estimated_cost_cents into review_count, estimated_cost_cents;

  ok := (review_count <= p_limit);

  return next;
  return;
end;
$$;
