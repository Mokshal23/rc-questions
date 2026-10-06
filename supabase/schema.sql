-- Run once in the Supabase SQL editor. Each friend joins with the private
-- group code shown in the README. RLS keeps attempts visible only to their owner.
create extension if not exists pgcrypto;

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_slug text not null,
  score smallint not null check (score >= 0),
  question_count smallint not null check (question_count > 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  check (score <= question_count)
);

create index if not exists quiz_attempts_owner_idx
  on public.quiz_attempts (user_id, completed_at desc);

-- A member may complete each article quiz only once, regardless of device.
create unique index if not exists quiz_attempts_one_per_user_quiz_idx
  on public.quiz_attempts (user_id, quiz_slug);

create or replace function public.join_group(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_group uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a group';
  end if;
  select id into found_group
    from public.study_groups
    where invite_code = upper(trim(p_invite_code));
  if found_group is null then
    raise exception 'That invite code was not recognised';
  end if;
  insert into public.group_members (group_id, user_id)
    values (found_group, auth.uid())
    on conflict do nothing;
  return found_group;
end;
$$;

create or replace function public.get_my_group()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.group_members
  where user_id = auth.uid()
  order by joined_at
  limit 1;
$$;

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "Members can read their group" on public.study_groups;
create policy "Members can read their group"
  on public.study_groups for select to authenticated
  using (public.is_group_member(id));

drop policy if exists "Members can read their membership" on public.group_members;
create policy "Members can read their membership"
  on public.group_members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users read only their own attempts" on public.quiz_attempts;
create policy "Users read only their own attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "Users insert only their own attempts" on public.quiz_attempts;
create policy "Users insert only their own attempts"
  on public.quiz_attempts for insert to authenticated
  with check (user_id = auth.uid() and public.is_group_member(group_id));

revoke all on public.study_groups from anon, authenticated;
revoke all on public.group_members from anon, authenticated;
revoke all on public.quiz_attempts from anon, authenticated;
grant select on public.study_groups, public.group_members to authenticated;
grant select, insert on public.quiz_attempts to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.get_my_group() to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;

-- Create the one shared study room. Save the returned invite_code privately
-- and share it only with your friends.
insert into public.study_groups (name)
select 'CAT Reading Room'
where not exists (select 1 from public.study_groups where name = 'CAT Reading Room');

select name, invite_code from public.study_groups where name = 'CAT Reading Room';
