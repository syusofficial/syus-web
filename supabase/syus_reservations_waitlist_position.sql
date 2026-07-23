-- 대기 순번 노출 — 2026-07-23 디자인팀 UX 종합감사 B3 반영
-- 배경: 대기자 본인이 몇 번째로 대기 중인지 알 방법이 없었다. DB에는 이미
-- created_at 순서 정보가 있으므로(cancel_reservation의 승격 로직이 그대로 쓰는
-- 값), 다른 신청자의 개인정보를 노출하지 않고 "순번(숫자)"만 안전하게 계산해
-- 돌려주는 함수 두 개를 추가한다. 새 컬럼·테이블 변경 없음 — RPC만 추가/보강.
-- 실행: Supabase SQL Editor에서 1회. syus_reservations.sql, syus_reservations_waitlist_promotion.sql 이후 아무 때나 실행 가능(멱등).

-- 1) 게스트 셀프 조회(신청번호+연락처, /reservations/[code] 페이지) — lookup_reservation()에
--    waitlist_position 필드를 추가해 재정의한다. 기존 권한 체크 로직은 그대로 유지.
create or replace function public.lookup_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_position int;
begin
  select r.*, s.title as show_title, s.schedule_start, s.schedule_end
    into v_row
    from public.syus_reservations r join public.shows s on s.id = r.show_id
    where r.reservation_code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.user_id is not null then
    if auth.uid() is distinct from v_row.user_id and not public.syus_is_admin() then
      return jsonb_build_object('ok', false, 'reason', 'forbidden');
    end if;
  else
    if p_contact is null or v_row.guest_contact is distinct from p_contact then
      return jsonb_build_object('ok', false, 'reason', 'forbidden');
    end if;
  end if;

  v_position := null;
  if v_row.status = 'waitlisted' then
    select count(*) + 1 into v_position
      from public.syus_reservations
      where show_id = v_row.show_id and status = 'waitlisted' and created_at < v_row.created_at;
  end if;

  return jsonb_build_object(
    'ok', true,
    'show_title', v_row.show_title,
    'schedule_start', v_row.schedule_start,
    'schedule_end', v_row.schedule_end,
    'party_size', v_row.party_size,
    'status', v_row.status,
    'code', v_row.reservation_code,
    'waitlist_position', v_position
  );
end;
$$;

-- 2) 로그인 사용자의 마이페이지 "내 예약" 탭 — 본인이 대기 중인 신청 전체의 순번을
--    한 번에 받아온다. auth.uid()로만 필터링하므로 다른 사람 신청은 절대 노출되지 않는다.
create or replace function public.get_my_waitlist_positions()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'position', t.pos)), '[]'::jsonb)
  from (
    select r.id,
      (select count(*) from public.syus_reservations w
         where w.show_id = r.show_id and w.status = 'waitlisted' and w.created_at < r.created_at) + 1 as pos
    from public.syus_reservations r
    where r.user_id = auth.uid() and r.status = 'waitlisted'
  ) t;
$$;
