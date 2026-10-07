-- Phase 15 — game interactivity: quiz questions + votes (migration 0016).
-- Apply in the Supabase SQL editor AFTER 0001–0015.
--
-- Model: a game keeps its display card (title/description); quiz and vote
-- games attach ordered questions with 2–8 text options stored as JSONB.
-- correct_option is null for pure polls and a 0-based index into options
-- for scored quizzes (revealed to guests after voting).
-- Votes are one-per-name per question (UNIQUE question_id + guest_name).
-- Guest names are self-typed, so this is spam friction, not identity —
-- the same trust level as guestbook signatures. Tallies are computed in
-- app code; RLS only gates row access.

create table if not exists game_questions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  game_id uuid not null references games(id) on delete cascade,
  question text not null check (char_length(question) between 1 and 300),
  options jsonb not null default '[]'::jsonb,
  correct_option integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists game_votes (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  question_id uuid not null references game_questions(id) on delete cascade,
  guest_name text not null check (char_length(guest_name) between 1 and 80),
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  unique (question_id, guest_name)
);

create index if not exists game_questions_game_id_idx on game_questions (game_id);
create index if not exists game_questions_wedding_id_idx on game_questions (wedding_id);
create index if not exists game_votes_question_id_idx on game_votes (question_id);
create index if not exists game_votes_wedding_id_idx on game_votes (wedding_id);

alter table game_questions enable row level security;
alter table game_votes enable row level security;

-- member-all on both (couple moderation + reads).
drop policy if exists "game_questions_member_all" on game_questions;
create policy "game_questions_member_all" on game_questions
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

drop policy if exists "game_votes_member_all" on game_votes;
create policy "game_votes_member_all" on game_votes
  for all using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

-- public reads on published weddings: questions only for active games,
-- votes are tally-visible so live results render for guests.
drop policy if exists "game_questions_public_read" on game_questions;
create policy "game_questions_public_read" on game_questions
  for select using (
    exists (
      select 1 from public.games g
      join public.wedding_websites w on w.wedding_id = g.wedding_id
      where g.id = game_questions.game_id
        and g.is_active = true
        and w.is_published = true
    )
  );

drop policy if exists "game_votes_public_read" on game_votes;
create policy "game_votes_public_read" on game_votes
  for select using (
    exists (
      select 1 from public.wedding_websites w
      where w.wedding_id = game_votes.wedding_id and w.is_published = true
    )
  );

-- public votes: published weddings + active games only. Range validation
-- (option_index < options length) runs in app code before insert.
drop policy if exists "game_votes_public_insert" on game_votes;
create policy "game_votes_public_insert" on game_votes
  for insert with check (
    option_index >= 0
    and exists (
      select 1 from public.game_questions q
      join public.games g on g.id = q.game_id
      join public.wedding_websites w on w.wedding_id = q.wedding_id
      where q.id = game_votes.question_id
        and g.is_active = true
        and w.is_published = true
    )
  );
