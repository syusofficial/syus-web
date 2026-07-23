-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — Anthropic 위탁·국외이전 개별 통지 발송 이력 컬럼 (2026-07-20)
-- 근거: output/legal/2026-07-20_anthropic_위탁_통지_최종결정.md (법무팀 최종 결정)
-- 목적: 2026-08-02 시행 개인정보처리방침 개정(Anthropic PBC 위탁·국외이전 추가)을
--       기존 가입 회원 전체(탈퇴·이메일 미인증 제외)에게 개별 이메일로 통지 —
--       그 발송 여부·시각을 회원별로 남겨 (1) 중복 발송 방지 (2) "통지 안 받았다"는
--       이의 제기 시 증빙 자료로 사용.
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run
-- idempotent — 다시 실행해도 안전
-- ─────────────────────────────────────────────────────────────────────

-- 1) profiles 에 이 통지 전용 발송 이력 컬럼 (welcome_email_sent_at과 동일 패턴)
alter table public.profiles
  add column if not exists privacy_notice_20260802_sent_at timestamptz;

comment on column public.profiles.privacy_notice_20260802_sent_at is
  '2026-08-02 시행 개인정보처리방침 개정(Anthropic PBC 위탁·국외이전 추가) 개별 통지 이메일 발송 시각. '
  'null이면 미발송(발송 대상). scripts/privacy-notice-20260802/send.ts 가 발송 직후 이 컬럼을 채운다. '
  '이 통지는 1회성 — 새 개정 통지가 생기면 그때는 새 컬럼을 추가한다(이 컬럼을 재사용하지 않는다).';

-- ─────────────────────────────────────────────────────────────────────
-- 참고
-- - 탈퇴 회원은 이 SQL과 무관하게 이미 발송 대상에서 빠짐: 계정 탈퇴 시
--   auth.users 행 삭제 → CASCADE로 profiles 행도 함께 삭제되므로
--   (src/app/api/account/delete/route.ts 참고) profiles를 조회 기준으로 삼는 것만으로
--   탈퇴 계정은 자동 제외된다.
-- - 이메일 미인증 계정 제외는 DB 컬럼이 아니라 스크립트가 auth.users.email_confirmed_at을
--   직접 확인해서 처리한다 (profiles에는 인증 여부가 없음).
-- ─────────────────────────────────────────────────────────────────────
