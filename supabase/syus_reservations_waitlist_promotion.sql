-- 대기자 자동 승격 — cancel_reservation() 보강
-- 배경: 2026-07-07 기능 점검(사장님이 예매 기능 보완은 자체판단 후 자동 반영하라고
-- 지시함). 발견한 공백: 정원이 찬 공연에서 확정 신청이 취소돼도 대기자가
-- 자동으로 확정되지 않아, 자리가 났는데도 대기자가 영영 대기 상태로 남는 버그.
--
-- 수정: confirmed 신청이 취소되면, 같은 공연 단위 advisory lock 안에서
-- 대기자를 신청 순서(created_at asc)대로 확인해 남은 정원만큼 자동 confirmed로
-- 승격시킨다. submit_reservation()과 동일한 락 패턴(공연 단위 직렬화)을 재사용해
-- 취소·신규신청·연쇄취소가 동시에 몰려도 정원을 넘기지 않는다.
-- 승격된 신청자에게 확정 메일을 보낼 수 있도록, 승격 목록(코드·연락처·이름·인원)을
-- 반환값에 포함한다 — 실제 메일 발송은 server action(cancelReservationAction)이 담당.
--
-- 실행: Supabase SQL Editor에서 1회. syus_reservations.sql 이후 아무 때나 실행 가능(멱등).

create or replace function public.cancel_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_promoted jsonb := '[]'::jsonb;
  v_capacity int;
  v_confirmed int;
  v_candidate record;
  v_show_title text;
begin
  select * into v_row from public.syus_reservations where reservation_code = p_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.status = 'cancelled' then
    return jsonb_build_object('ok', false, 'reason', 'already_cancelled');
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

  -- 취소·신규신청이 동시에 몰려도 정원 계산이 어긋나지 않도록 공연 단위 직렬화
  perform pg_advisory_xact_lock(hashtext(v_row.show_id::text));

  select title into v_show_title from public.shows where id = v_row.show_id;

  update public.syus_reservations set status = 'cancelled' where id = v_row.id;

  -- 확정 신청이 취소돼 자리가 났으면, 대기자를 신청 순서대로 자동 승격
  if v_row.status = 'confirmed' then
    select capacity into v_capacity from public.shows where id = v_row.show_id;

    if v_capacity is not null then
      select coalesce(sum(party_size), 0) into v_confirmed
        from public.syus_reservations where show_id = v_row.show_id and status = 'confirmed';

      for v_candidate in
        select * from public.syus_reservations
        where show_id = v_row.show_id and status = 'waitlisted'
        order by created_at asc
      loop
        exit when v_confirmed + v_candidate.party_size > v_capacity;
        update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
        v_confirmed := v_confirmed + v_candidate.party_size;
        v_promoted := v_promoted || jsonb_build_object(
          'code', v_candidate.reservation_code,
          'contact', v_candidate.guest_contact,
          'name', v_candidate.guest_name,
          'party_size', v_candidate.party_size
        );
      end loop;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'promoted', v_promoted, 'show_id', v_row.show_id, 'show_title', v_show_title);
end;
$$;
