-- 정원을 나중에 늘렸을 때도 대기자가 자동 승격되도록 — DB 트리거로 보강
-- 배경: 2026-07-07 추가 점검. cancel_reservation()은 취소로 자리가 날 때 대기자를
-- 승격시키지만, 공연자가 공연 수정 폼에서 정원 숫자 자체를 늘리는 경우(예: 더 큰
-- 공연장으로 변경)는 그 경로를 안 거쳐서 대기자가 계속 대기로 남는 공백이 있었다.
-- "정원이 바뀌면 항상 재계산한다"를 트리거로 못박아, 앞으로 정원을 바꾸는 코드가
-- 어디에 추가되든(관리자 화면 등) 놓치지 않게 한다.
--
-- 제약: 트리거는 이메일을 못 보낸다(외부 HTTP 호출 불가) — 이 경로로 승격된 사람은
-- 확정 메일을 받지 못하고, 마이페이지/신청번호 조회에서 상태 변경만 확인 가능하다.
-- (취소로 인한 승격은 기존대로 cancel_reservation()이 메일까지 보낸다.)
-- 실행: Supabase SQL Editor에서 1회.

create or replace function public.syus_promote_waitlist_on_capacity_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_confirmed int;
  v_candidate record;
begin
  -- 다른 승격 경로(취소)와 동일한 락 키로 직렬화 — 동시 변경에도 정원 초과 방지
  perform pg_advisory_xact_lock(hashtext(new.id::text));

  if new.reservation_closed then
    return new; -- 수동 마감 중엔 승격하지 않음
  end if;

  if new.capacity is null then
    -- 무제한으로 바뀌면 대기자 전원 확정
    update public.syus_reservations set status = 'confirmed'
      where show_id = new.id and status = 'waitlisted';
    return new;
  end if;

  select coalesce(sum(party_size), 0) into v_confirmed
    from public.syus_reservations where show_id = new.id and status = 'confirmed';

  for v_candidate in
    select * from public.syus_reservations
    where show_id = new.id and status = 'waitlisted'
    order by created_at asc
  loop
    exit when v_confirmed + v_candidate.party_size > new.capacity;
    update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
    v_confirmed := v_confirmed + v_candidate.party_size;
  end loop;

  return new;
end;
$$;

-- capacity 변경뿐 아니라 "예약 다시 열기"(reservation_closed true→false)에도 재계산 —
-- 마감 중엔 승격을 안 시켰으니 재개 시점에 밀린 대기자를 확인해야 한다.
drop trigger if exists syus_shows_capacity_promote on public.shows;
create trigger syus_shows_capacity_promote
  after update of capacity, reservation_closed on public.shows
  for each row
  when (
    new.capacity is distinct from old.capacity
    or new.reservation_closed is distinct from old.reservation_closed
  )
  execute function public.syus_promote_waitlist_on_capacity_change();
