-- Run once in the existing Supabase project's SQL Editor.
-- No attempt history is deleted. If duplicate attempts already exist, this
-- migration stops safely; review them before applying the unique index.
do $$
begin
  if exists (
    select 1
    from public.quiz_attempts
    group by user_id, quiz_slug
    having count(*) > 1
  ) then
    raise exception 'Duplicate user/article attempts exist. Review them with the duplicate-check query in this migration before enforcing one attempt per article.';
  end if;
end;
$$;

create unique index if not exists quiz_attempts_one_per_user_quiz_idx
  on public.quiz_attempts (user_id, quiz_slug);

-- If the guard above reports duplicates, inspect them with:
-- select user_id, quiz_slug, count(*) as attempt_count,
--        array_agg(id order by completed_at) as attempt_ids
-- from public.quiz_attempts
-- group by user_id, quiz_slug
-- having count(*) > 1;
