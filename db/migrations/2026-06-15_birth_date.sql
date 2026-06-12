-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — profiles.birth_date 컬럼 추가 (2026-06-15)
-- 사장님 결정 2026-06-13: PIPA v2.1 개정에 따른 만 14세 이상 가입 게이트
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run
-- idempotent — 다시 실행해도 안전
-- ─────────────────────────────────────────────────────────────────────

-- 1) profiles 에 생년월일 컬럼 (만 14세 이상 확인 용도)
alter table public.profiles
  add column if not exists birth_date date;

comment on column public.profiles.birth_date is
  'PIPA v2.1(2026-06-15 시행) 만 14세 이상 가입 게이트 확인 용도. 가입 시점 입력, 이후 정정만 허용.';

-- 2) 가입 시점 만 14세 이상 확인 — DB 레벨 2차 방어
--    클라이언트와 서버 액션에서 1차로 차단하지만, DB도 막아 안전 다중화
alter table public.profiles
  drop constraint if exists profiles_birth_date_age_check;

alter table public.profiles
  add constraint profiles_birth_date_age_check
  check (
    birth_date is null
    or birth_date <= (current_date - interval '14 years')
  );

-- ─────────────────────────────────────────────────────────────────────
-- 참고
-- - 기존 회원의 birth_date 는 null 로 유지됨 (소급 적용 안 함)
-- - 신규 가입 시점부터 필수 입력
-- - 만 14세 미만 가입 시도는 클라이언트·서버 액션·DB 3중에서 차단됨
-- ─────────────────────────────────────────────────────────────────────
