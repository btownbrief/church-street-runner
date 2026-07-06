-- Btown Games leaderboard schema.
-- Paste this WHOLE file into the Supabase SQL Editor and click Run.
--
-- Designed to be shared by every Btown game (Church Street Runner, FILED,
-- and the rest of play.btownbrief.com someday): rows are keyed by
-- (game, player_id, month) and hold each player's BEST score for that
-- game + month. When a month ends its board simply stops changing —
-- old months stay in the table forever ("cemented").
--
-- No logins: each browser mints a random player id + secret token
-- (stored in localStorage). The token proves ownership of a row, so only
-- the device that set a score can rename or improve it.

create table if not exists public.scores (
  game text not null,
  player_id uuid not null,
  month text not null,                -- 'YYYY-MM' in America/New_York time
  name text not null,
  score integer not null check (score >= 0 and score <= 1000000),
  token text not null,                -- device secret; proves row ownership
  updated_at timestamptz not null default now(),
  primary key (game, player_id, month)
);

-- Lock the table down completely: the public web key can only go through
-- the functions below — it can never read tokens or write rows directly.
alter table public.scores enable row level security;
revoke all on table public.scores from anon, authenticated;

create or replace function public.month_key() returns text
language sql stable as $$
  select to_char(now() at time zone 'America/New_York', 'YYYY-MM');
$$;

-- Upsert the player's best score for the current month.
create or replace function public.submit_score(
  p_game text, p_player uuid, p_token text, p_name text, p_score integer
) returns void
language plpgsql security definer set search_path = public as $$
declare
  clean_name text := left(trim(p_name), 20);
begin
  if p_score < 0 or p_score > 1000000 then return; end if;
  if clean_name is null or length(clean_name) = 0 then clean_name := 'Runner'; end if;
  insert into scores (game, player_id, month, name, score, token)
  values (p_game, p_player, month_key(), clean_name, p_score, p_token)
  on conflict (game, player_id, month) do update
    set score = greatest(scores.score, excluded.score),
        name = excluded.name,
        updated_at = now()
    where scores.token = excluded.token;  -- only the owning device may update
end $$;

-- Rename everywhere (all games, all months) — scores are kept.
create or replace function public.rename_player(
  p_player uuid, p_token text, p_name text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  clean_name text := left(trim(p_name), 20);
begin
  if clean_name is null or length(clean_name) = 0 then return; end if;
  update scores set name = clean_name, updated_at = now()
  where player_id = p_player and token = p_token;
end $$;

-- Top scores for a game + month (defaults to the current month).
-- player_id is returned so the client can highlight "you" in the list.
create or replace function public.get_leaderboard(
  p_game text, p_month text default null
) returns table (name text, score integer, player_id uuid)
language sql security definer stable set search_path = public as $$
  select name, score, player_id from scores
  where game = p_game and month = coalesce(p_month, month_key())
  order by score desc, updated_at asc
  limit 25;
$$;

grant execute on function public.submit_score(text, uuid, text, text, integer) to anon;
grant execute on function public.rename_player(uuid, text, text) to anon;
grant execute on function public.get_leaderboard(text, text) to anon;
