begin;
create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 timezone text not null
);
create table public.habits (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 slot smallint not null check(slot between 1 and 5),
 name text not null check(char_length(btrim(name)) between 1 and 60),
 created_date date not null,
 unique(user_id,slot)
);
create table public.completions (
 habit_id uuid not null references public.habits(id) on delete cascade,
 day date not null,
 primary key(habit_id,day)
);
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.completions enable row level security;
revoke all on public.profiles,public.habits,public.completions from anon,authenticated;
grant select on public.profiles,public.habits,public.completions to authenticated;
create policy own_profile on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_habits on public.habits for select to authenticated using(user_id=(select auth.uid()));
create policy own_completions on public.completions for select to authenticated using(exists(select 1 from public.habits h where h.id=habit_id and h.user_id=(select auth.uid())));

create function public.tracker_state(requested_zone text default 'UTC') returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); zone text; result jsonb;
begin
 if owner is null or not exists(select 1 from auth.users where id=owner) then raise exception 'Please sign in again.'; end if;
 select timezone into zone from public.profiles where user_id=owner;
 zone:=coalesce(zone,requested_zone);
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Choose a valid timezone.'; end if;
 select jsonb_build_object(
  'habits',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slot',slot,'name',name,'created_date',created_date) order by slot) from public.habits where user_id=owner),'[]'::jsonb),
  'completions',coalesce((select jsonb_agg(jsonb_build_object('habit_id',c.habit_id,'day',c.day) order by c.day) from public.completions c join public.habits h on h.id=c.habit_id where h.user_id=owner),'[]'::jsonb),
  'timezone',zone,'today',(current_timestamp at time zone zone)::date
 ) into result;
 return result;
end $$;

create function public.tracker_action(input jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid(); zone text; today date; op text:=input->>'action'; habit public.habits; habit_name text; available_slot integer; check_day date;
begin
 if owner is null or not exists(select 1 from auth.users where id=owner) then raise exception 'Please sign in again.'; end if;
 if jsonb_typeof(input)<>'object' or pg_column_size(input)>4096 then raise exception 'Invalid request.'; end if;
 zone:=input->>'timezone';
 if zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Choose a valid timezone.'; end if;
 if op is null or op not in ('create','rename','complete','delete') then raise exception 'Unknown action.'; end if;
 insert into public.profiles(user_id,timezone) values(owner,zone) on conflict(user_id) do nothing;
 -- Every mutation for an account is serialized, including competing slot allocations.
 select timezone into zone from public.profiles where user_id=owner for update;
 today:=(current_timestamp at time zone zone)::date;
 if op in ('create','rename') then
  habit_name:=btrim(input->>'name');
  if jsonb_typeof(input->'name') is distinct from 'string' or char_length(habit_name) not between 1 and 60 then raise exception 'Use a habit name between 1 and 60 characters.'; end if;
 end if;
 if op<>'create' then
  select * into habit from public.habits where id::text=input->>'id' and user_id=owner;
  if not found then raise exception 'Habit not found.'; end if;
 end if;
 if op='create' then
  select n into available_slot from generate_series(1,5) n where not exists(select 1 from public.habits h where h.user_id=owner and h.slot=n) order by n limit 1;
  if available_slot is null then raise exception 'You can track up to five habits. Delete one to make room.'; end if;
  insert into public.habits(user_id,slot,name,created_date) values(owner,available_slot,habit_name,today);
 elsif op='rename' then update public.habits set name=habit_name where id=habit.id and user_id=owner;
 elsif op='delete' then delete from public.habits where id=habit.id and user_id=owner;
 elsif op='complete' then
  if jsonb_typeof(input->'completed') is distinct from 'boolean' or coalesce(input->>'day','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid check-in.'; end if;
  begin check_day:=(input->>'day')::date; exception when others then raise exception 'Invalid check-in date.'; end;
  if check_day<habit.created_date or check_day>today then raise exception 'Choose a date from when you created this habit through today.'; end if;
  if (input->>'completed')::boolean then insert into public.completions(habit_id,day) values(habit.id,check_day) on conflict do nothing;
  else delete from public.completions where habit_id=habit.id and day=check_day; end if;
 end if;
 return public.tracker_state(zone);
end $$;
revoke all on function public.tracker_state(text),public.tracker_action(jsonb) from public,anon;
grant execute on function public.tracker_state(text),public.tracker_action(jsonb) to authenticated;
commit;
