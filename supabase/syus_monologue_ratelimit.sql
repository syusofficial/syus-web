-- ─────────────────────────────────────────────────────────────
-- 독백 생성 원자적 클레임 + 일일 사용량 캡 (TOCTOU 경쟁 차단)
-- 배경(2026-07-02 보안 점검, MEDIUM): 라우트의 count-then-act 캡은 비원자적이라
--   동시 요청으로 우회 가능(pending 다수 생성 → 동시 generate → Opus 과금 폭주).
-- 이 함수는 유저별 advisory lock 안에서 최근 24h '완료 건수'(reviewing|delivered)를 세고,
--   한도 미만이면 대상 행을 pending→reviewing 으로 원자적으로 '클레임'한다.
--   (advisory_xact_lock 이 유저 단위로 직렬화 → 동시 요청이라도 정확히 카운트)
-- 반환: ok | ratelimited | forbidden | already | notfound | unauthorized
-- 실행: Supabase SQL Editor 에서 1회. (라우트는 이 함수가 없으면 레거시 비원자 경로로 폴백)
-- ─────────────────────────────────────────────────────────────

create or replace function public.syus_start_generation(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean := public.syus_is_admin();
  v_owner uuid;
  v_status text;
  v_count int;
begin
  if v_uid is null then return 'unauthorized'; end if;

  -- 유저 단위 직렬화 — 동시 요청 경쟁(TOCTOU) 제거
  perform pg_advisory_xact_lock(hashtext(v_uid::text));

  select user_id, status into v_owner, v_status
    from public.syus_monologues where id = p_id;
  if not found then return 'notfound'; end if;

  if not v_admin then
    if v_owner <> v_uid then return 'forbidden'; end if;
    if v_status <> 'pending' then return 'already'; end if;
    select count(*) into v_count from public.syus_monologues
      where user_id = v_uid
        and status in ('reviewing', 'delivered')
        and created_at > now() - interval '24 hours';
    if v_count >= 3 then return 'ratelimited'; end if;
  end if;

  -- 클레임: pending→reviewing 원자적 전환(재진입 방지 + 캡 카운트 반영)
  update public.syus_monologues set status = 'reviewing' where id = p_id;
  return 'ok';
end;
$$;
