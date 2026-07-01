-- ============================================================
-- 시우스 커뮤니티 — 1차 vertical slice: 연기 고민 QnA + 좋아요(찜)
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query → 전체 붙여넣고 [Run]
-- 안전: 여러 번 실행해도 됩니다(if not exists / drop policy 후 재생성).
-- 기존 auth.users / profiles 재사용. 시우스 전용 테이블만 추가.
-- ============================================================

-- 1) 질문
create table if not exists public.syus_questions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 120),
  body       text not null check (char_length(body) between 1 and 4000),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 답변
create table if not exists public.syus_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.syus_questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  is_accepted boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 3) 좋아요(찜) — 섹션 공통. target_type으로 확장(question/answer/review/...).
create table if not exists public.syus_likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

-- 인덱스
create index if not exists syus_questions_created_idx on public.syus_questions (created_at desc);
create index if not exists syus_questions_user_idx    on public.syus_questions (user_id);
create index if not exists syus_answers_question_idx   on public.syus_answers (question_id, created_at);
create index if not exists syus_likes_target_idx       on public.syus_likes (target_type, target_id);
create index if not exists syus_likes_user_idx         on public.syus_likes (user_id, target_type);

-- updated_at 자동 갱신
create or replace function public.syus_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists syus_questions_touch on public.syus_questions;
create trigger syus_questions_touch before update on public.syus_questions
  for each row execute function public.syus_touch_updated_at();

-- ============================================================
-- RLS (읽기 공개 / 쓰기 로그인+본인)
-- ============================================================
alter table public.syus_questions enable row level security;
alter table public.syus_answers   enable row level security;
alter table public.syus_likes     enable row level security;

-- 질문
drop policy if exists "syus_q read"        on public.syus_questions;
drop policy if exists "syus_q insert"      on public.syus_questions;
drop policy if exists "syus_q update own"  on public.syus_questions;
drop policy if exists "syus_q delete own"  on public.syus_questions;
create policy "syus_q read"       on public.syus_questions for select using (true);
create policy "syus_q insert"     on public.syus_questions for insert with check (auth.uid() = user_id);
create policy "syus_q update own" on public.syus_questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_q delete own" on public.syus_questions for delete using (auth.uid() = user_id);

-- 답변 (채택 표시는 질문 작성자도 가능)
drop policy if exists "syus_a read"       on public.syus_answers;
drop policy if exists "syus_a insert"     on public.syus_answers;
drop policy if exists "syus_a update"     on public.syus_answers;
drop policy if exists "syus_a delete own" on public.syus_answers;
create policy "syus_a read"   on public.syus_answers for select using (true);
create policy "syus_a insert" on public.syus_answers for insert with check (auth.uid() = user_id);
create policy "syus_a update" on public.syus_answers for update using (
  auth.uid() = user_id
  or auth.uid() = (select q.user_id from public.syus_questions q where q.id = question_id)
);
create policy "syus_a delete own" on public.syus_answers for delete using (auth.uid() = user_id);

-- 좋아요
drop policy if exists "syus_l read"       on public.syus_likes;
drop policy if exists "syus_l insert"     on public.syus_likes;
drop policy if exists "syus_l delete own" on public.syus_likes;
create policy "syus_l read"       on public.syus_likes for select using (true);
create policy "syus_l insert"     on public.syus_likes for insert with check (auth.uid() = user_id);
create policy "syus_l delete own" on public.syus_likes for delete using (auth.uid() = user_id);
