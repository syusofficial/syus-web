-- ─────────────────────────────────────────────────────────────────────
-- page_views 에 주소 꼬리표(UTM) 칸 3개 추가 (2026-10-07)
--
-- 왜: 인스타 스토리·DM·프로필 링크로 들어온 방문을 구분하려고.
--     링크 끝에 ?utm_source=instagram&utm_medium=story&utm_campaign=... 를 붙이면
--     방문 기록기(src/components/PageViewTracker.tsx)가 이 값을 함께 저장한다.
--
-- 실행: Supabase Dashboard → SQL Editor 에 통째로 붙여넣고 Run.
--       여러 번 실행해도 안전하다(if not exists).
--       실행 전에도 사이트는 깨지지 않는다 — 기록기가 칸이 없으면 꼬리표만 빼고 저장한다.
--
-- 개인정보: 꼬리표는 운영자가 링크에 직접 적은 글자라 개인을 알아볼 수 없다.
--           기존 page_views 90일 정리(cron)가 그대로 함께 지운다.
-- ─────────────────────────────────────────────────────────────────────

alter table public.page_views add column if not exists utm_source   text;  -- 예: instagram
alter table public.page_views add column if not exists utm_medium   text;  -- 예: story / dm / profile
alter table public.page_views add column if not exists utm_campaign text;  -- 예: 2026-10_추석

-- 꼬리표 붙은 방문만 빠르게 모아 보기 (꼬리표 없는 대다수 행은 색인에 넣지 않는다)
create index if not exists idx_page_views_utm_source
  on public.page_views (utm_source, created_at desc)
  where utm_source is not null;

-- PostgREST(사이트가 쓰는 API)가 새 칸을 바로 알아보게 스키마 캐시 새로고침
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────
-- (참고) 실행 뒤 확인·집계용 조회 — 읽기만 한다. 필요할 때 아래 주석을 풀어 실행.
--
-- 1) 칸이 생겼는지
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'page_views' and column_name like 'utm_%';
--
-- 2) 최근 30일, 꼬리표별 방문 세션 수·페이지 수 (운영자 본인 제외)
-- select utm_source, utm_medium, utm_campaign,
--        count(distinct session_id) as 세션, count(*) as 페이지
--   from public.page_views
--  where utm_source is not null and is_admin = false
--    and created_at > now() - interval '30 days'
--  group by 1, 2, 3
--  order by 세션 desc;
-- ─────────────────────────────────────────────────────────────────────
