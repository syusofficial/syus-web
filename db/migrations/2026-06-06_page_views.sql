-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — 일일/누적 방문자 집계 (2026-06-06)
-- 사장님 요청: 관리자 통계 탭에 "하루에 몇 명 들렀다 갔는가" 노출
-- 정확도 80%, 실시간성·데이터 소유권 확보 우선 (GA는 별도)
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run
-- ─────────────────────────────────────────────────────────────────────

-- 1) page_views 테이블 — 1방문 1행
create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,                     -- 방문 경로 (/, /shows, /shows/xxx 등)
  referrer text,                          -- 유입 출처 (선택, document.referrer)
  session_id text,                        -- 클라이언트 세션 ID (sessionStorage 30분 갱신)
  user_agent text,                        -- 봇 필터링용 (300자 cap)
  is_admin boolean not null default false,-- 운영자 본인 트래픽 분리 (admin role)
  created_at timestamptz not null default now()
);

-- 빠른 일·주·월 집계
create index if not exists idx_page_views_created_at on public.page_views(created_at desc);
create index if not exists idx_page_views_path on public.page_views(path);
create index if not exists idx_page_views_is_admin on public.page_views(is_admin);

-- ─────────────────────────────────────────────────────────────────────
-- RLS 정책 — 익명 insert 허용 / select는 관리자만
-- ─────────────────────────────────────────────────────────────────────

alter table public.page_views enable row level security;

-- 익명·로그인 사용자 모두 자기 방문 1건씩 insert 가능
drop policy if exists "anyone_insert_page_view" on public.page_views;
create policy "anyone_insert_page_view"
  on public.page_views
  for insert
  with check (true);

-- 관리자만 read (집계용)
drop policy if exists "admin_select_page_views" on public.page_views;
create policy "admin_select_page_views"
  on public.page_views
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 관리자만 삭제 (필요 시 오래된 로그 정리)
drop policy if exists "admin_delete_page_views" on public.page_views;
create policy "admin_delete_page_views"
  on public.page_views
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────
-- 끝. 다음 단계:
--   1. 클라이언트 PageViewTracker가 자동으로 insert
--   2. /admin → 통계 탭에서 일일/누적 카드 확인
--   3. (선택) 90일 이상 로그는 주기적으로 delete (Supabase cron)
-- ─────────────────────────────────────────────────────────────────────
