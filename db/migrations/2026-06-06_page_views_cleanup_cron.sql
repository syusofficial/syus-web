-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — page_views 90일 자동 정리 (Supabase pg_cron, 2026-06-06)
-- 사장님 요청: 운영자 손 안 대게 매일 03시 KST 자동 삭제
-- 정책: 90일 = AdminStats 노출 범위 = 자체 분석 보존 기한
--       그 이상은 GA에 위임 (무료, 무제한 보존)
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run (1회)
-- ─────────────────────────────────────────────────────────────────────

-- 1) pg_cron extension 활성화
--    Supabase 모든 플랜(무료 포함)에서 사용 가능. cron 스키마 자동 생성.
create extension if not exists pg_cron with schema extensions;

-- 2) 권한 부여 — postgres 역할이 cron.job 테이블에 접근 가능하도록
--    Supabase 무료 플랜 표준 구성. 권한 없으면 Plan B (Vercel cron) 사용.
grant usage on schema cron to postgres;

-- 3) 기존 동일 이름 job이 있으면 제거 (재실행 안전)
do $$
declare
  existing_jobid bigint;
begin
  select jobid into existing_jobid
  from cron.job
  where jobname = 'syus_page_views_cleanup';
  if existing_jobid is not null then
    perform cron.unschedule(existing_jobid);
  end if;
end $$;

-- 4) 매일 KST 03시 (UTC 18시) 에 90일 이전 row 삭제
--    pg_cron 은 UTC 기준이므로 03 KST = 18 UTC
--    KST → UTC = -9시간. 03 - 9 = -6 → 18 (전날)
select cron.schedule(
  'syus_page_views_cleanup',
  '0 18 * * *',
  $$delete from public.page_views where created_at < now() - interval '90 days'$$
);

-- 5) 등록 확인 — 이 select 결과에 1행이 나오면 성공
--    schedule = "0 18 * * *", active = true 면 정상 등록
select jobid, jobname, schedule, command, active
  from cron.job
  where jobname = 'syus_page_views_cleanup';

-- ─────────────────────────────────────────────────────────────────────
-- Plan B — pg_cron 권한 오류로 실패 시 (예: 셀프호스팅 Supabase)
--   1. 위 select가 0행이거나 cron 스키마 접근이 막혀 있다면
--   2. Vercel cron 으로 대체:
--      vercel.json 에 다음 추가:
--      { "crons": [{ "path": "/api/cron/cleanup-page-views", "schedule": "0 18 * * *" }] }
--      그리고 /src/app/api/cron/cleanup-page-views/route.ts 에서
--      service_role 키로 직접 delete 실행
--   3. 또는 사장님이 매월 1회 수동 실행:
--      delete from public.page_views where created_at < now() - interval '90 days';
-- ─────────────────────────────────────────────────────────────────────

-- 끝. 다음 단계:
--   1. 이 SQL을 Supabase Dashboard → SQL Editor 에 붙여넣고 Run
--   2. 5번 select 결과로 등록 확인
--   3. 내일 03시 KST 이후 cron.job_run_details 로 실행 이력 조회 가능:
--      select * from cron.job_run_details where jobname = 'syus_page_views_cleanup' order by start_time desc limit 5;
-- ─────────────────────────────────────────────────────────────────────
