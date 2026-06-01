-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — 공연 후기 시스템 마이그레이션 (2026-06-02)
-- 사장님 결정: 후기 + 자동 검열(사전 + OpenAI Moderation 2단)
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run
-- ─────────────────────────────────────────────────────────────────────

-- 1) reviews 테이블
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 10 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'public', 'hidden', 'blocked')),
  moderation jsonb,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (show_id, user_id)  -- 1인 1후기 (수정만 가능)
);

create index if not exists idx_reviews_show_status on public.reviews(show_id, status);
create index if not exists idx_reviews_status_created on public.reviews(status, created_at desc);
create index if not exists idx_reviews_user on public.reviews(user_id);

-- updated_at 자동 갱신 트리거
create or replace function public.touch_reviews_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_touch_reviews on public.reviews;
create trigger trg_touch_reviews
  before update on public.reviews
  for each row execute procedure public.touch_reviews_updated_at();

-- 2) review_reports 테이블 (사용자 신고)
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_id)  -- 본인 1회 신고 제한
);

create index if not exists idx_review_reports_review on public.review_reports(review_id);

-- 3) banned_users 테이블 (계정 제재)
create table if not exists public.banned_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text,
  banned_by uuid references auth.users(id),
  banned_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- RLS 정책
-- ─────────────────────────────────────────────────────────────────────

alter table public.reviews enable row level security;
alter table public.review_reports enable row level security;
alter table public.banned_users enable row level security;

-- reviews: 공개분만 read (또는 본인 글), 본인만 insert/update, 관리자는 모두
drop policy if exists "공개 후기 read" on public.reviews;
create policy "공개 후기 read" on public.reviews
  for select using (status = 'public');

drop policy if exists "본인 후기 read" on public.reviews;
create policy "본인 후기 read" on public.reviews
  for select using (auth.uid() = user_id);

drop policy if exists "관리자 후기 read" on public.reviews;
create policy "관리자 후기 read" on public.reviews
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "본인 후기 insert" on public.reviews;
create policy "본인 후기 insert" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and not exists (select 1 from public.banned_users b where b.user_id = auth.uid())
  );

drop policy if exists "본인 후기 update" on public.reviews;
create policy "본인 후기 update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "본인 후기 delete" on public.reviews;
create policy "본인 후기 delete" on public.reviews
  for delete using (auth.uid() = user_id);

drop policy if exists "관리자 후기 update" on public.reviews;
create policy "관리자 후기 update" on public.reviews
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "관리자 후기 delete" on public.reviews;
create policy "관리자 후기 delete" on public.reviews
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- review_reports: 로그인 사용자 본인만 insert, 본인+관리자만 read
drop policy if exists "본인 신고 insert" on public.review_reports;
create policy "본인 신고 insert" on public.review_reports
  for insert with check (auth.uid() = reporter_id);

drop policy if exists "본인 신고 read" on public.review_reports;
create policy "본인 신고 read" on public.review_reports
  for select using (auth.uid() = reporter_id);

drop policy if exists "관리자 신고 read" on public.review_reports;
create policy "관리자 신고 read" on public.review_reports
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- banned_users: 관리자만 read/write
drop policy if exists "관리자 banned read" on public.banned_users;
create policy "관리자 banned read" on public.banned_users
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "관리자 banned insert" on public.banned_users;
create policy "관리자 banned insert" on public.banned_users
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "관리자 banned delete" on public.banned_users;
create policy "관리자 banned delete" on public.banned_users
  for delete using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────
-- 자동: 신고 3건 누적 시 reviews.status = 'hidden' (운영자 검토 큐로)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.bump_review_report_count()
returns trigger language plpgsql security definer as $$
declare new_count integer;
begin
  update public.reviews
    set report_count = report_count + 1
  where id = new.review_id
  returning report_count into new_count;

  -- 3건 누적 시 자동 hidden
  if new_count >= 3 then
    update public.reviews set status = 'hidden'
      where id = new.review_id and status = 'public';
  end if;
  return new;
end $$;

drop trigger if exists trg_bump_report_count on public.review_reports;
create trigger trg_bump_report_count
  after insert on public.review_reports
  for each row execute procedure public.bump_review_report_count();

-- ─────────────────────────────────────────────────────────────────────
-- 완료. 이 마이그레이션은 idempotent — 다시 실행해도 안전.
-- ─────────────────────────────────────────────────────────────────────
