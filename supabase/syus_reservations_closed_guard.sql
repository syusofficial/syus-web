-- submit_reservation()/cancel_reservation()이 reservation_closed(수동 매진)를
-- 서버에서도 확인하도록 보강.
-- 배경: 2026-07-07 기능 점검 — 프런트(SeatReservationForm)는 마감 시 폼을 숨기지만,
-- RPC 자체는 reservation_closed를 확인하지 않아서 폼을 이미 열어둔 상태거나 API를
-- 직접 호출하면 마감된 공연에도 신청이 들어갈 수 있었다. "클라이언트를 믿지 않는다"
-- 원칙대로 서버(RPC)에서도 동일하게 막는다.
-- 실행: Supabase SQL Editor에서 1회. 2026-07-07_shows_reservation_closed.sql 이후 실행.

create or replace function public.submit_reservation(
  p_show_id uuid, p_party_size int,
  p_guest_name text default null, p_guest_contact text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_capacity int;
  v_closed boolean;
  v_confirmed int;
  v_code text;
  v_status text;
begin
  if p_party_size is null or p_party_size < 1 or p_party_size > 10 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_party_size');
  end if;
  if v_uid is null and (p_guest_name is null or length(trim(p_guest_name)) = 0
                        or p_guest_contact is null or length(trim(p_guest_contact)) = 0) then
    return jsonb_build_object('ok', false, 'reason', 'guest_info_required');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_show_id::text));

  select capacity, reservation_closed into v_capacity, v_closed
    from public.shows where id = p_show_id and status = 'approved';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'show_not_found');
  end if;
  if v_closed then
    return jsonb_build_object('ok', false, 'reason', 'reservation_closed');
  end if;

  select coalesce(sum(party_size), 0) into v_confirmed
    from public.syus_reservations where show_id = p_show_id and status = 'confirmed';

  v_status := case
    when v_capacity is null then 'confirmed'
    when v_confirmed + p_party_size <= v_capacity then 'confirmed'
    else 'waitlisted'
  end;
  v_code := 'MUOL-' || to_char(now(), 'MMDD') || '-' || lpad((floor(random() * 1000))::int::text, 3, '0');

  insert into public.syus_reservations (show_id, user_id, guest_name, guest_contact, party_size, status, reservation_code)
  values (p_show_id, v_uid, p_guest_name, p_guest_contact, p_party_size, v_status, v_code);

  return jsonb_build_object('ok', true, 'status', v_status, 'code', v_code);
end;
$$;

-- 공연자가 수동 마감한 공연은 취소로 자리가 나도 대기자를 자동 승격하지 않는다
-- (마감 의도를 존중 — 재개는 "예약 다시 열기"로 명시적으로).
create or replace function public.cancel_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_promoted jsonb := '[]'::jsonb;
  v_capacity int;
  v_closed boolean;
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

  perform pg_advisory_xact_lock(hashtext(v_row.show_id::text));

  select title, capacity, reservation_closed into v_show_title, v_capacity, v_closed
    from public.shows where id = v_row.show_id;

  update public.syus_reservations set status = 'cancelled' where id = v_row.id;

  if v_row.status = 'confirmed' and not v_closed and v_capacity is not null then
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

  return jsonb_build_object('ok', true, 'promoted', v_promoted, 'show_id', v_row.show_id, 'show_title', v_show_title);
end;
$$;
