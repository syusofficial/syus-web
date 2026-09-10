-- ─────────────────────────────────────────────────────────────────────
-- 무대올림 — 좌석 신청자에게도 D-3/D-1 알림 보내기 (2026-09-10)
--
-- 배경
--   /api/cron/show-reminders 는 그동안 likes(찜)만 보고 알림을 보냈다.
--   좌석을 실제로 신청한 사람(syus_reservations.status='confirmed') — 즉 올 확률이
--   가장 높은 사람에게는 알림이 가지 않았다. 신청 폼은 화면에서 이미
--   "공연 사흘 전과 하루 전, 잊지 않도록 메일로 알려드립니다"라고 약속하고 있었다.
--   그 어긋남의 대가(노쇼)는 학생 공연팀이 치른다.
--
-- 이 SQL이 하는 일
--   notification_log.kind 의 CHECK 제약에 신청 알림용 kind 두 개를 더한다.
--     D3  / D1   — 찜(likes) 알림          (기존)
--     D3R / D1R  — 좌석 신청 알림           (신설, R = Reservation)
--   kind 를 나누는 이유는 "찜으로 보낸 알림"과 "신청으로 보낸 알림"을 이력에서 구분하기
--   위해서다. 중복 발송 차단 자체는 라우트가 (user_id, show_id, 남은 일수) 단위로,
--   D3·D3R 두 kind 를 함께 조회해 판정한다 — 같은 사람이 찜과 신청을 둘 다 해도
--   같은 공연 알림은 한 통만 나간다.
--
-- 실행: Supabase Dashboard → SQL Editor 에 통째로 붙여넣고 Run — 1회.
--       재실행해도 안전(idempotent).
--
-- 실행하지 않으면?
--   메일 발송은 정상이지만 D3R/D1R 기록이 CHECK 제약에 막힌다. 라우트가 이를 감지해
--   기존 kind(D3/D1)로 되돌려 기록하므로 중복 발송은 일어나지 않는다. 다만 Vercel 로그에
--   "kind CHECK 제약에 D3R/D1R이 없을 수 있습니다" 경고가 매번 남고, 알림 이력에서
--   찜/신청 구분이 되지 않는다. 되도록 실행해 주시는 편이 좋다.
-- ─────────────────────────────────────────────────────────────────────

-- 1) 기존 kind CHECK 제약 제거
--    제약 이름은 보통 notification_log_kind_check 지만, 컬럼 정의로 만든 제약은
--    환경에 따라 이름이 다를 수 있어 kind 를 참조하는 CHECK 제약을 이름으로 찾지 않고
--    정의 내용으로 찾아 지운다.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'notification_log'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.notification_log drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) 신청 알림 kind 를 포함한 새 CHECK 제약
alter table public.notification_log
  add constraint notification_log_kind_check
  check (kind in ('D3', 'D1', 'D3R', 'D1R'));

comment on table public.notification_log is
  '공연 D-3/D-1 알림 발송 이력. kind: D3/D1=찜(likes) 알림, D3R/D1R=좌석 신청(syus_reservations) 알림. '
  '(user_id, show_id, kind) 유니크. 중복 발송 판정은 라우트가 D3·D3R(또는 D1·D1R)을 함께 조회해서 한다.';

-- ─────────────────────────────────────────────────────────────────────
-- 참고 — 인덱스는 추가하지 않는다.
--   cron 이 쓰는 조회는 syus_reservations(show_id, status) 인덱스(syus_reservations_show_idx,
--   supabase/syus_reservations.sql 에서 생성)로 이미 충분하다.
--   신청 건수가 크게 늘면 그때 status='confirmed' 부분 인덱스를 검토한다.
--
-- 참고 — 게스트(비로그인) 신청자
--   이번 변경은 회원 신청자만 대상으로 한다. syus_reservations.guest_contact 는
--   전화번호일 수도 있고, 그 값을 알림 발송에 쓰는 것이 수집 목적 안에 있는지
--   개인정보 처리방침 확인이 필요하다 → 법무팀 확인 후 별도 판단.
-- ─────────────────────────────────────────────────────────────────────
