-- Applied to the live project as migration "yale_only_and_rate_limits".
-- Yale-only accounts, per-user rate limits and caps. Kept here for reference.

-- Only @yale.edu accounts can be created, whatever the sign-in method.
create or replace function private.enforce_yale_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(new.email) !~ '^[^@\s]+@yale\.edu$' then
    raise exception 'TripTable is only open to @yale.edu accounts.' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger enforce_yale_signup before insert or update of email on auth.users
  for each row execute function private.enforce_yale_signup();

-- Per-user rate limits (private schema: not reachable from the API).
create table private.rate_events (user_id uuid not null, action text not null, at timestamptz not null default now());
create index rate_events_lookup on private.rate_events (user_id, action, at desc);

create or replace function private.rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  act text := tg_argv[0];
  max_n int := tg_argv[1]::int;
  win interval := tg_argv[2]::interval;
  recent int;
begin
  if uid is null then return new; end if;
  delete from private.rate_events where at < now() - interval '1 day';
  select count(*) into recent from private.rate_events where user_id = uid and action = act and at > now() - win;
  if recent >= max_n then
    raise exception 'Slow down: too many % actions. Try again later.', act using errcode = 'P0001';
  end if;
  insert into private.rate_events (user_id, action) values (uid, act);
  return new;
end; $$;

create trigger rate_limit_reviews before insert on public.reviews for each row execute function private.rate_limit('review', '20', '1 hour');
create trigger rate_limit_reports before insert on public.review_reports for each row execute function private.rate_limit('report', '20', '1 hour');
create trigger rate_limit_friend_requests before insert on public.friendships for each row execute function private.rate_limit('friend_request', '30', '1 hour');
create trigger rate_limit_trips before insert on public.trips for each row execute function private.rate_limit('trip', '120', '1 hour');

-- At most 200 saved trips per person.
create or replace function private.cap_trips()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.trips where user_id = new.user_id and id <> new.id) >= 200 then
    raise exception 'Trip limit reached (200).' using errcode = 'P0001';
  end if;
  return new;
end; $$;
create trigger cap_trips before insert on public.trips for each row execute function private.cap_trips();

alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://'));

-- Migration "anonymous_reviews": reviews are fully anonymous.
-- author is always 'Yale student'; clients can't read user_id or write the table directly.
-- Writes go through save_review() / delete_review(); my_review_ids() returns only your own ids.
-- (See the live project for the function bodies.)

-- Migration "moderation_and_feedback": private.admins (moderator emails), is_admin(),
-- admin_reports() / admin_remove_review() / admin_dismiss_reports(), and the feedback
-- table (anyone can send; only admins can read or resolve; rate-limited).
-- To add a moderator: insert into private.admins (email) values ('netid@yale.edu');

-- Migration "trip_invites": invites between accepted friends. Only the sender can create (as pending),
-- only the recipient can accept/decline, outsiders can't see them; rate-limited to 40/hour.
-- Migration "trip_details": trips.details jsonb (flights, people, notes, checklist), max 16 KB.

-- ---------- shared_trip_notes ----------
-- trip_notes(place, start, end): notes saved by friends on the same trip (same place, overlapping
-- dates, and one of the two listed the other on their trip). Authenticated only.

-- ---------- google_calendar_links ----------
-- private.gcal_links(user_id, refresh_token, events): Google Calendar refresh tokens, readable only by the
-- gcal edge function through gcal_get / gcal_save / gcal_set_events / gcal_forget (service_role only).
