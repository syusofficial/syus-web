-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — 관심 공연 D-3/D-1 알림 시스템 (2026-06-12)
-- 사장님 결정 2026-06-08: 관심 공연 개별 트리거 (좋아요한 공연 기준)
-- 실행: Supabase Dashboard → SQL Editor 에서 통째로 붙여넣고 Run
-- idempotent — 다시 실행해도 안전
-- ─────────────────────────────────────────────────────────────────────

-- 1) profiles 에 알림 수신 동의 컬럼 (기본 true = 수신)
alter table public.profiles
  add column if not exists notify_show_reminders boolean not null default true;

comment on column public.profiles.notify_show_reminders is
  '관심 공연 D-3/D-1 알림 메일 수신 동의. false면 cron이 발송 건너뜀.';

-- 2) notification_log — 알림 발송 이력 (멱등성)
create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  show_id uuid not null references public.shows(id) on delete cascade,
  kind text not null check (kind in ('D3', 'D1')),
  sent_at timestamptz not null default now(),
  unique (user_id, show_id, kind)
);

create index if not exists idx_notification_log_user on public.notification_log(user_id);
create index if not exists idx_notification_log_show on public.notification_log(show_id);
create index if not exists idx_notification_log_sent_at on public.notification_log(sent_at desc);

comment on table public.notification_log is
  '관심 공연 알림 발송 이력. (user_id, show_id, kind) 유니크로 같은 공연에 대한 같은 종류 알림 중복 발송 차단.';

-- 3) RLS — 본인 이력만 조회 가능, 관리자는 전체
alter table public.notification_log enable row level security;

drop policy if exists "본인 알림이력 read" on public.notification_log;
create policy "본인 알림이력 read" on public.notification_log
  for select using (auth.uid() = user_id);

drop policy if exists "관리자 알림이력 read" on public.notification_log;
create policy "관리자 알림이력 read" on public.notification_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- insert는 service role(admin client)만 사용 — 일반 RLS는 막아 둠
-- (cron 라우트의 createAdminClient가 service role로 RLS 우회)

-- ─────────────────────────────────────────────────────────────────────
-- 4) (선택) likes 테이블에 schedule_start 조회 가속용 인덱스
-- likes 가 매우 크지 않으면 불필요. 운영팀 모니터링 후 사장님 결정.
-- ─────────────────────────────────────────────────────────────────────
create index if not exists idx_likes_user_show on public.likes(user_id, show_id);

-- ─────────────────────────────────────────────────────────────────────
-- 완료. 운영자 액션
--   1) 이 SQL을 Supabase SQL Editor 에 통째로 붙여넣고 Run
--   2) Vercel 환경변수 CRON_SECRET 등록 (32자 이상 임의 문자열)
--   3) Vercel 배포 시 vercel.json crons 자동 활성화 — UI 확인만
-- ─────────────────────────────────────────────────────────────────────
