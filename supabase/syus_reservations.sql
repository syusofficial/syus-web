-- ┌──────────────────────────────────────────────────────────┐
-- │ 무대올림 자체 예매(좌석 신청) — 2026-07-06 신설              │
-- └──────────────────────────────────────────────────────────┘
-- 배경: 무대올림이 "홍보만 하고 예매는 외부로 넘기는" 구조였던 것을,
-- 사이트 안에서 좌석 신청이 완결되는 자체 시스템으로 확장.
-- 게스트(비로그인) 신청을 지원해야 하므로 RLS insert는 열지 않고
-- security definer RPC(submit_reservation)로만 처리한다.
-- 정원 체크는 syus_monologue_ratelimit.sql의 advisory lock 패턴을
-- "유저 단위"에서 "공연(show) 단위"로 바꿔 그대로 재사용한다(오버부킹 방지).
-- 실행: Supabase SQL Editor에서 1회. db/migrations/2026-07-06_shows_capacity.sql을 먼저 실행할 것.

create table if not exists public.syus_reservations (
  id                uuid primary key default gen_random_uuid(),
  show_id           uuid not null references public.shows(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,   -- nullable: 게스트 허용
  guest_name        text,
  guest_contact     text,                                                -- 전화 또는 이메일
  party_size        int not null default 1 check (party_size between 1 and 10),
  status            text not null default 'confirmed',                  -- confirmed|waitlisted|cancelled
  reservation_code  text not null unique,                                -- 예: MUOL-0706-042
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint syus_reservations_identity check (
    user_id is not null or (guest_name is not null and guest_contact is not null)
  )
);
create index if not exists syus_reservations_show_idx on public.syus_reservations (show_id, status);
create index if not exists syus_reservations_user_idx on public.syus_reservations (user_id, created_at desc);

drop trigger if exists syus_reservations_touch on public.syus_reservations;
create trigger syus_reservations_touch before update on public.syus_reservations
  for each row execute function public.syus_touch_updated_at();

alter table public.syus_reservations enable row level security;

drop policy if exists "syus_rsv read"   on public.syus_reservations;
drop policy if exists "syus_rsv update" on public.syus_reservations;
create policy "syus_rsv read"   on public.syus_reservations for select using (auth.uid() = user_id or public.syus_is_admin());
create policy "syus_rsv update" on public.syus_reservations for update using (public.syus_is_admin());
-- insert 정책 없음(의도적) — 아래 submit_reservation()만이 유일한 삽입 경로.

-- 신청 접수: 공연 단위 advisory lock으로 정원 초과(오버부킹)를 원자적으로 방지.
create or replace function public.submit_reservation(
  p_show_id uuid, p_party_size int,
  p_guest_name text default null, p_guest_contact text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_capacity int;
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

  select capacity into v_capacity from public.shows where id = p_show_id and status = 'approved';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'show_not_found');
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

-- 취소: 로그인 사용자는 본인 것만, 게스트는 신청번호+연락처가 일치할 때만.
create or replace function public.cancel_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
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

  update public.syus_reservations set status = 'cancelled' where id = v_row.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- 게스트 셀프 조회(취소 페이지용) — 신청번호+연락처 일치 시에만 행 노출.
create or replace function public.lookup_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
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

  return jsonb_build_object(
    'ok', true,
    'show_title', v_row.show_title,
    'schedule_start', v_row.schedule_start,
    'schedule_end', v_row.schedule_end,
    'party_size', v_row.party_size,
    'status', v_row.status,
    'code', v_row.reservation_code
  );
end;
$$;
