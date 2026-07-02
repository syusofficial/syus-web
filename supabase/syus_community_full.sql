-- ============================================================
-- 시우스 커뮤니티 — 6개 섹션 전체 스키마 + 보안규칙(RLS) + 저장소
-- 실행: Supabase 대시보드 → SQL Editor → New query → 전체 붙여넣고 [Run]
-- 안전: 전 구문 멱등(if not exists / drop policy 후 재생성 / create or replace).
--       여러 번 실행해도 데이터 손상 없음. 기존 auth.users / profiles 재사용.
-- 섹션 매핑: proscenium=견해글 · thrust=QnA · arena=자유 · blackbox=관람의잔상 · flex=독백 · corridor=책서재
-- ============================================================


-- ┌──────────────────────────────────────────────────────────┐
-- │ 0. 공용 함수                                                │
-- └──────────────────────────────────────────────────────────┘

-- updated_at 자동 갱신
create or replace function public.syus_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- 관리자(운영자) 여부 — RLS에서 사용 (security definer로 profiles를 RLS 우회 조회)
create or replace function public.syus_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;


-- ┌──────────────────────────────────────────────────────────┐
-- │ 1. 공용 테이블 — 좋아요(찜) · 댓글 · 신고 (전 섹션 공통)       │
-- └──────────────────────────────────────────────────────────┘

-- 좋아요/찜 : target_type = question|answer|essay|post|review|monologue|book|comment ...
create table if not exists public.syus_likes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
create index if not exists syus_likes_target_idx on public.syus_likes (target_type, target_id);
create index if not exists syus_likes_user_idx   on public.syus_likes (user_id, target_type);

-- 댓글 : 섹션 공통(다형 참조)
create table if not exists public.syus_comments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_type text not null,               -- essay|post|review|book|question ...
  target_id   uuid not null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists syus_comments_target_idx on public.syus_comments (target_type, target_id, created_at);
drop trigger if exists syus_comments_touch on public.syus_comments;
create trigger syus_comments_touch before update on public.syus_comments
  for each row execute function public.syus_touch_updated_at();

-- 신고 : CS/운영자 큐
create table if not exists public.syus_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 1000),
  status      text not null default 'open',   -- open|resolved
  created_at  timestamptz not null default now()
);
create index if not exists syus_reports_status_idx on public.syus_reports (status, created_at);


-- ┌──────────────────────────────────────────────────────────┐
-- │ 2. 프로시니엄 — 주인장 견해글 (운영자 발행) '연기의 냉장고'     │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_essays (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,  -- 발행자(운영자)
  title       text not null check (char_length(title) between 2 and 160),
  excerpt     text,
  body        text not null check (char_length(body) between 1 and 40000),
  series_no   int,                              -- '연기의 냉장고 · N'
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists syus_essays_pub_idx on public.syus_essays (published, created_at desc);
drop trigger if exists syus_essays_touch on public.syus_essays;
create trigger syus_essays_touch before update on public.syus_essays
  for each row execute function public.syus_touch_updated_at();

-- 독자 '질문 받기' 입력함 (운영자가 골라 답글)
create table if not exists public.syus_essay_asks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  answered    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists syus_essay_asks_idx on public.syus_essay_asks (answered, created_at);


-- ┌──────────────────────────────────────────────────────────┐
-- │ 3. 돌출 무대 — 연기 고민 QnA (이미 1차 구현된 슬라이스)        │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_questions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 120),
  body       text not null check (char_length(body) between 1 and 4000),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists syus_questions_created_idx on public.syus_questions (created_at desc);
create index if not exists syus_questions_user_idx    on public.syus_questions (user_id);
drop trigger if exists syus_questions_touch on public.syus_questions;
create trigger syus_questions_touch before update on public.syus_questions
  for each row execute function public.syus_touch_updated_at();

create table if not exists public.syus_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.syus_questions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 4000),
  is_accepted boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists syus_answers_question_idx on public.syus_answers (question_id, created_at);


-- ┌──────────────────────────────────────────────────────────┐
-- │ 4. 원형 무대 — 자유 커뮤니티 (게시판)                         │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null default '잡담',        -- 잡담|소식|모집|연습후기|질문
  title      text not null check (char_length(title) between 2 and 120),
  body       text not null check (char_length(body) between 1 and 8000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists syus_posts_created_idx on public.syus_posts (created_at desc);
create index if not exists syus_posts_cat_idx     on public.syus_posts (category, created_at desc);
drop trigger if exists syus_posts_touch on public.syus_posts;
create trigger syus_posts_touch before update on public.syus_posts
  for each row execute function public.syus_touch_updated_at();


-- ┌──────────────────────────────────────────────────────────┐
-- │ 5. 블랙박스 — 관람의 잔상 (공연·영화·드라마 후기, 사진 첨부)    │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  work_title   text not null check (char_length(work_title) between 1 and 160),
  work_type    text not null default '공연',        -- 공연|영화|드라마
  rating       int  not null check (rating between 1 and 5),
  body         text not null check (char_length(body) between 1 and 8000),
  tags         text[] not null default '{}',
  image_url    text,                                -- 저장소(syus-media) 경로
  image_source text,                                -- 이미지 출처(필수: 이미지가 있으면)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- 이미지가 있으면 출처 표기 필수 (가이드북 §4.4 ④ / §9 ③)
  constraint syus_reviews_source_required
    check (image_url is null or (image_source is not null and char_length(image_source) > 0))
);
create index if not exists syus_reviews_created_idx on public.syus_reviews (created_at desc);
drop trigger if exists syus_reviews_touch on public.syus_reviews;
create trigger syus_reviews_touch before update on public.syus_reviews
  for each row execute function public.syus_touch_updated_at();


-- ┌──────────────────────────────────────────────────────────┐
-- │ 6. 변형 무대 — 창작 독백 생성 아카이브 (요청 큐 · B안)         │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_monologues (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,  -- 요청자
  char_type      text,                              -- 인물 유형
  emotion        text,                              -- 감정·상황
  length_spec    text,                              -- 길이(문장/초)
  tone           text,                              -- 톤·장르
  purpose        text,                              -- 용도(오디션용/연습용)
  gender         text,
  age_range      text,
  generated_text text,                              -- 생성된 독백(검수 후 채움)
  status         text not null default 'pending',   -- pending|reviewing|delivered|rejected
  allow_public   boolean not null default false,    -- 요청자 공개 동의
  is_public      boolean not null default false,    -- 운영자 공개 처리
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists syus_monologues_user_idx   on public.syus_monologues (user_id, created_at desc);
create index if not exists syus_monologues_public_idx on public.syus_monologues (is_public, created_at desc);
create index if not exists syus_monologues_status_idx on public.syus_monologues (status, created_at);
drop trigger if exists syus_monologues_touch on public.syus_monologues;
create trigger syus_monologues_touch before update on public.syus_monologues
  for each row execute function public.syus_touch_updated_at();


-- ┌──────────────────────────────────────────────────────────┐
-- │ 7. 사잇 무대 — 책 서재 (연기·무대 도서 후기)                  │
-- └──────────────────────────────────────────────────────────┘
create table if not exists public.syus_books (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 200),
  author     text,
  topic      text,                                  -- 발성|신체|이론|전기|연출 ...
  rating     int check (rating between 1 and 5),
  note       text check (char_length(note) <= 4000),
  cover_url  text,                                  -- 저장소(syus-media) 경로
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists syus_books_created_idx on public.syus_books (created_at desc);
create index if not exists syus_books_topic_idx   on public.syus_books (topic, created_at desc);
drop trigger if exists syus_books_touch on public.syus_books;
create trigger syus_books_touch before update on public.syus_books
  for each row execute function public.syus_touch_updated_at();


-- ============================================================
-- RLS — 읽기 공개 / 쓰기 로그인+본인 (운영자 전용은 syus_is_admin())
-- ============================================================
alter table public.syus_likes       enable row level security;
alter table public.syus_comments     enable row level security;
alter table public.syus_reports      enable row level security;
alter table public.syus_essays       enable row level security;
alter table public.syus_essay_asks   enable row level security;
alter table public.syus_questions    enable row level security;
alter table public.syus_answers      enable row level security;
alter table public.syus_posts        enable row level security;
alter table public.syus_reviews      enable row level security;
alter table public.syus_monologues   enable row level security;
alter table public.syus_books        enable row level security;

-- 좋아요
drop policy if exists "syus_l read"       on public.syus_likes;
drop policy if exists "syus_l insert"     on public.syus_likes;
drop policy if exists "syus_l delete own" on public.syus_likes;
create policy "syus_l read"       on public.syus_likes for select using (true);
create policy "syus_l insert"     on public.syus_likes for insert with check (auth.uid() = user_id);
create policy "syus_l delete own" on public.syus_likes for delete using (auth.uid() = user_id);

-- 댓글
drop policy if exists "syus_c read"       on public.syus_comments;
drop policy if exists "syus_c insert"     on public.syus_comments;
drop policy if exists "syus_c update own" on public.syus_comments;
drop policy if exists "syus_c delete own" on public.syus_comments;
create policy "syus_c read"       on public.syus_comments for select using (true);
create policy "syus_c insert"     on public.syus_comments for insert with check (auth.uid() = user_id);
create policy "syus_c update own" on public.syus_comments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_c delete own" on public.syus_comments for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 신고 (읽기·처리는 운영자만)
drop policy if exists "syus_r insert"  on public.syus_reports;
drop policy if exists "syus_r read"    on public.syus_reports;
drop policy if exists "syus_r update"  on public.syus_reports;
create policy "syus_r insert" on public.syus_reports for insert with check (auth.uid() = user_id);
create policy "syus_r read"   on public.syus_reports for select using (public.syus_is_admin());
create policy "syus_r update" on public.syus_reports for update using (public.syus_is_admin());

-- 견해글 (발행은 운영자만 / 읽기는 공개 published)
drop policy if exists "syus_e read"   on public.syus_essays;
drop policy if exists "syus_e insert" on public.syus_essays;
drop policy if exists "syus_e update" on public.syus_essays;
drop policy if exists "syus_e delete" on public.syus_essays;
create policy "syus_e read"   on public.syus_essays for select using (published = true or public.syus_is_admin());
create policy "syus_e insert" on public.syus_essays for insert with check (public.syus_is_admin() and auth.uid() = user_id);
create policy "syus_e update" on public.syus_essays for update using (public.syus_is_admin());
create policy "syus_e delete" on public.syus_essays for delete using (public.syus_is_admin());

-- 견해글 질문받기 (제출은 로그인 본인 / 열람은 운영자 또는 본인)
drop policy if exists "syus_ea insert" on public.syus_essay_asks;
drop policy if exists "syus_ea read"   on public.syus_essay_asks;
create policy "syus_ea insert" on public.syus_essay_asks for insert with check (auth.uid() = user_id);
create policy "syus_ea read"   on public.syus_essay_asks for select using (auth.uid() = user_id or public.syus_is_admin());

-- 질문
drop policy if exists "syus_q read"       on public.syus_questions;
drop policy if exists "syus_q insert"     on public.syus_questions;
drop policy if exists "syus_q update own" on public.syus_questions;
drop policy if exists "syus_q delete own" on public.syus_questions;
create policy "syus_q read"       on public.syus_questions for select using (true);
create policy "syus_q insert"     on public.syus_questions for insert with check (auth.uid() = user_id);
create policy "syus_q update own" on public.syus_questions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_q delete own" on public.syus_questions for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 답변 (채택은 질문 작성자도 가능)
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
create policy "syus_a delete own" on public.syus_answers for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 자유 게시글
drop policy if exists "syus_p read"       on public.syus_posts;
drop policy if exists "syus_p insert"     on public.syus_posts;
drop policy if exists "syus_p update own" on public.syus_posts;
drop policy if exists "syus_p delete own" on public.syus_posts;
create policy "syus_p read"       on public.syus_posts for select using (true);
create policy "syus_p insert"     on public.syus_posts for insert with check (auth.uid() = user_id);
create policy "syus_p update own" on public.syus_posts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_p delete own" on public.syus_posts for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 관람 후기
drop policy if exists "syus_rv read"       on public.syus_reviews;
drop policy if exists "syus_rv insert"     on public.syus_reviews;
drop policy if exists "syus_rv update own" on public.syus_reviews;
drop policy if exists "syus_rv delete own" on public.syus_reviews;
create policy "syus_rv read"       on public.syus_reviews for select using (true);
create policy "syus_rv insert"     on public.syus_reviews for insert with check (auth.uid() = user_id);
create policy "syus_rv update own" on public.syus_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_rv delete own" on public.syus_reviews for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 독백 (읽기=공개분·본인·운영자 / 생성·상태변경=운영자 / 요청=본인)
drop policy if exists "syus_m read"       on public.syus_monologues;
drop policy if exists "syus_m insert"     on public.syus_monologues;
drop policy if exists "syus_m update"     on public.syus_monologues;
drop policy if exists "syus_m delete own" on public.syus_monologues;
create policy "syus_m read"   on public.syus_monologues for select using (is_public = true or auth.uid() = user_id or public.syus_is_admin());
create policy "syus_m insert" on public.syus_monologues for insert with check (auth.uid() = user_id);
create policy "syus_m update" on public.syus_monologues for update using (public.syus_is_admin());
create policy "syus_m delete own" on public.syus_monologues for delete using (auth.uid() = user_id or public.syus_is_admin());

-- 책 서재
drop policy if exists "syus_b read"       on public.syus_books;
drop policy if exists "syus_b insert"     on public.syus_books;
drop policy if exists "syus_b update own" on public.syus_books;
drop policy if exists "syus_b delete own" on public.syus_books;
create policy "syus_b read"       on public.syus_books for select using (true);
create policy "syus_b insert"     on public.syus_books for insert with check (auth.uid() = user_id);
create policy "syus_b update own" on public.syus_books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "syus_b delete own" on public.syus_books for delete using (auth.uid() = user_id or public.syus_is_admin());


-- ============================================================
-- 8. 저장소(Storage) — 관람 후기 사진 · 책 표지
--    버킷 'syus-media' (공개 URL 읽기 · 목록 SELECT 정책 없음). 업로드는 로그인 사용자가 본인 폴더({uid}/...)에만.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('syus-media', 'syus-media', true)
on conflict (id) do nothing;

drop policy if exists "syus media read"       on storage.objects;
drop policy if exists "syus media upload own" on storage.objects;
drop policy if exists "syus media update own" on storage.objects;
drop policy if exists "syus media delete own" on storage.objects;

-- 읽기(SELECT) 정책 없음(의도적): syus-media는 공개 버킷이라 이미지는 공개 URL로 바로
--   표시되고(정책 무관), 앱은 목록조회(.list())를 하지 않는다. 광범위 SELECT를 두면
--   버킷 전체 파일 열거(경로에 사용자 UUID 포함)가 가능 → 두지 않음(2026-07-02 Storage 보안 경고).
--   위의 drop 이 이전에 만든 "syus media read" 를 제거하므로 재실행 시 자동 정리됨.

create policy "syus media upload own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'syus-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "syus media update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'syus-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "syus media delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'syus-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- 끝. 실행 후 시우스 6섹션의 읽기/쓰기/좋아요/댓글/신고 + 사진 업로드가 활성화됩니다.
