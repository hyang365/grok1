-- TripTable shared database. Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Anyone can read reviews. Only signed-in @yale.edu accounts can write, and only their own.

create or replace function public.valid_ratings(r jsonb) returns boolean
language sql immutable as $$
  select jsonb_typeof(r) = 'object'
     and not exists (
       select 1 from jsonb_each(r) e
       where jsonb_typeof(e.value) <> 'number' or (e.value)::numeric not between 1 and 5
     )
$$;

create or replace function public.is_yale() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') ~* '^[^@[:space:]]+@yale\.edu$'
$$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('place', 'program')),
  target_id text not null check (char_length(target_id) between 1 and 120),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  author text not null check (char_length(author) between 2 and 60),
  term text not null check (char_length(term) between 1 and 40),
  year int not null check (year between 2000 and 2100),
  ratings jsonb not null check (public.valid_ratings(ratings)),
  body text not null check (char_length(body) between 20 and 4000),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

alter table public.reviews enable row level security;

drop policy if exists "reviews are public" on public.reviews;
create policy "reviews are public" on public.reviews for select using (true);

drop policy if exists "yale students post their own" on public.reviews;
create policy "yale students post their own" on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and public.is_yale());

drop policy if exists "edit own" on public.reviews;
create policy "edit own" on public.reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_yale());

drop policy if exists "delete own" on public.reviews;
create policy "delete own" on public.reviews for delete to authenticated using (user_id = auth.uid());

-- Reports go to a table only the project owner can read (no select policy), for moderation.
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews on delete cascade,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (review_id, reporter)
);

alter table public.review_reports enable row level security;

drop policy if exists "yale students report" on public.review_reports;
create policy "yale students report" on public.review_reports for insert to authenticated
  with check (reporter = auth.uid() and public.is_yale());
