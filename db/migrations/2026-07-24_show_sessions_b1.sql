-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 예약 시스템 B1 — 회차(날짜·시간)별 정원 분리 (2026-07-24)            │
-- └──────────────────────────────────────────────────────────────────┘
-- 배경: 디자인팀 UX 종합감사(2026-07-23)의 B1. 지금까지는 공연 1건에 정원(capacity)이
-- 숫자 하나뿐이라, "평일 19:30 / 주말 15:00"처럼 여러 날·여러 시간대로 열리는 공연도
-- 좌석 정원을 전체 기간 통틀어 하나로만 관리했다. 이 마이그레이션은 회차 테이블을 신설해
-- 회차마다 별도 정원을 걸 수 있게 한다. 설계안: output/production/2026-07-23_예약시스템_B그룹_대형2건_설계안.md
--
-- 실행: Supabase SQL Editor에서 전체를 통째로 붙여넣고 Run — 1회, idempotent(재실행 안전).
-- 순서 의존성: supabase/syus_reservations.sql, syus_reservations_waitlist_promotion.sql,
--   syus_reservations_organizer_access.sql, syus_reservations_capacity_change_promote.sql,
--   syus_reservations_closed_guard.sql, syus_reservations_waitlist_position.sql,
--   db/migrations/2026-07-06_shows_capacity.sql, 2026-07-07_shows_reservation_closed.sql
--   이 모두 이미 적용되어 있어야 한다(지금까지 순서대로 실행해왔다면 이미 적용된 상태).
--
-- 하위호환 설계: 이 SQL을 실행하기 전에도, 실행한 직후에도 프런트 코드는 이미 배포되어
-- 있어도 깨지지 않도록 짰다(자세한 내용은 각 함수 주석 참고).
--   - 실행 전: syus_reservations.session_id 컬럼과 show_sessions 테이블이 없으므로 프런트는
--     "회차 기능 없음"으로 인식하고 지금까지와 완전히 동일하게 동작한다.
--   - 실행 후: 프런트를 다시 배포하지 않아도, 다음 폴링(get_show_reservation_summary)부터
--     자동으로 회차 기능이 켜진다(재배포 불필요 — 같은 코드가 응답 안의 `sessions` 필드
--     유무로 스스로 감지한다).

-- ─────────────────────────────────────────────────────────────────────
-- 0) 날짜 자유 텍스트(schedule_start 등 "2026.05.10" 같은 텍스트) 파싱 유틸
--    — 아래 3)단계 백필에서만 쓰이지만, 향후에도 재사용 가능하도록 영구 함수로 둔다.
--    점(.)·슬래시(/)를 하이픈으로 통일해 timestamptz 캐스팅을 시도하고, 실패하면 null.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.syus_try_parse_date(p_text text)
returns timestamptz language plpgsql as $$
declare
  v_normalized text;
begin
  if p_text is null or length(trim(p_text)) = 0 then
    return null;
  end if;
  v_normalized := regexp_replace(trim(p_text), '[./]', '-', 'g');
  v_normalized := regexp_replace(v_normalized, '-+$', '');
  return v_normalized::timestamptz;
exception when others then
  return null;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 1) show_sessions 테이블 신설
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.show_sessions (
  id          uuid primary key default gen_random_uuid(),
  show_id     uuid not null references public.shows(id) on delete cascade,
  session_at  timestamptz not null,        -- 회차 날짜+시간
  capacity    int,                          -- null = 이 회차는 공연 전체 정원(shows.capacity)을 그대로 상속
  created_at  timestamptz not null default now()
);
create index if not exists show_sessions_show_idx on public.show_sessions (show_id, session_at);

alter table public.show_sessions enable row level security;

-- 회차는 개별 신청자 정보가 없는 "일정표"라 공개 노출에 위험이 없지만, 실제로 회차 목록을
-- 필요로 하는 화면(관객 신청 폼)은 이미 security definer RPC(get_show_reservation_summary)를
-- 거치므로 이 테이블에 별도 공개 read 정책은 두지 않는다 — 공연 등록자·운영자만 직접 조회.
drop policy if exists "show_sessions select" on public.show_sessions;
create policy "show_sessions select" on public.show_sessions for select using (
  public.syus_is_admin() or exists (
    select 1 from public.shows s where s.id = show_sessions.show_id and s.organizer_id = auth.uid()
  )
);
drop policy if exists "show_sessions insert" on public.show_sessions;
create policy "show_sessions insert" on public.show_sessions for insert with check (
  public.syus_is_admin() or exists (
    select 1 from public.shows s where s.id = show_sessions.show_id and s.organizer_id = auth.uid()
  )
);
drop policy if exists "show_sessions update" on public.show_sessions;
create policy "show_sessions update" on public.show_sessions for update using (
  public.syus_is_admin() or exists (
    select 1 from public.shows s where s.id = show_sessions.show_id and s.organizer_id = auth.uid()
  )
);
drop policy if exists "show_sessions delete" on public.show_sessions;
create policy "show_sessions delete" on public.show_sessions for delete using (
  public.syus_is_admin() or exists (
    select 1 from public.shows s where s.id = show_sessions.show_id and s.organizer_id = auth.uid()
  )
);

-- ─────────────────────────────────────────────────────────────────────
-- 2) syus_reservations.session_id 추가 (nullable — 하위호환)
-- ─────────────────────────────────────────────────────────────────────
alter table public.syus_reservations
  add column if not exists session_id uuid references public.show_sessions(id) on delete set null;
create index if not exists syus_reservations_session_idx on public.syus_reservations (session_id, status);

-- ─────────────────────────────────────────────────────────────────────
-- 3) 백필 — 기존 공연은 전부 "회차 1개"로, 기존 신청은 그 회차로 연결
--    (운영자 지시 2026-07-24 기본값: session_at은 schedule_start 파싱값, 실패 시 등록일,
--    capacity는 shows.capacity 그대로 이전. 멱등 — 이미 회차가 있는 공연은 건너뜀)
-- ─────────────────────────────────────────────────────────────────────
insert into public.show_sessions (show_id, session_at, capacity)
select s.id,
       coalesce(public.syus_try_parse_date(s.schedule_start), s.created_at, now()),
       s.capacity
from public.shows s
where not exists (select 1 from public.show_sessions ss where ss.show_id = s.id);

-- 위 백필 직후에는 모든 공연이 "정확히 회차 1개"이므로, 세션 없는 기존 신청을 전부
-- 그 회차로 연결해도 안전하다(둘 이상 회차가 있는 상태에서 잘못 연결될 위험이 없다).
update public.syus_reservations r
set session_id = ss.id
from public.show_sessions ss
where ss.show_id = r.show_id
  and r.session_id is null
  and (select count(*) from public.show_sessions ss2 where ss2.show_id = r.show_id) = 1;

-- ─────────────────────────────────────────────────────────────────────
-- 4) submit_reservation() 재작성 — 회차 단위 advisory lock·집계
--    시그니처가 바뀌므로(p_session_id 추가) 기존 4-인자 버전을 명시적으로 지운다.
--    (CREATE OR REPLACE는 인자 목록이 같을 때만 "교체"고, 다르면 오버로드가 하나 더 생겨
--    "함수가 모호함" 에러가 나므로 반드시 DROP 후 재생성해야 한다.)
--
--    p_session_id를 안 보내면(레거시 호출) 자동으로:
--      - 그 공연에 회차가 정확히 1개면 → 그 회차로 자동 선택(기존 프런트도 그대로 동작)
--      - 0개면 → 회차 기능 미사용, 공연 전체 단위로 기존과 동일하게 처리
--      - 2개 이상인데 지정이 없으면 → 'session_required' 오류(프런트가 회차 선택 UI를
--        빠뜨리고 호출한 경우에 대한 안전장치 — 조용히 정원 검사를 건너뛰지 않는다)
-- ─────────────────────────────────────────────────────────────────────
drop function if exists public.submit_reservation(uuid, int, text, text);

create or replace function public.submit_reservation(
  p_show_id uuid, p_party_size int,
  p_guest_name text default null, p_guest_contact text default null,
  p_session_id uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_show_capacity int;
  v_capacity int;
  v_closed boolean;
  v_confirmed int;
  v_code text;
  v_status text;
  v_session_id uuid := p_session_id;
  v_session_count int;
  v_session_show_id uuid;
  v_session_capacity int;
begin
  if p_party_size is null or p_party_size < 1 or p_party_size > 10 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_party_size');
  end if;
  if v_uid is null and (p_guest_name is null or length(trim(p_guest_name)) = 0
                        or p_guest_contact is null or length(trim(p_guest_contact)) = 0) then
    return jsonb_build_object('ok', false, 'reason', 'guest_info_required');
  end if;

  -- 회차 자동 해석(락 이전 — 회차 "목록" 조회 자체는 신청 동시성과 무관)
  if v_session_id is null then
    select count(*), min(id) into v_session_count, v_session_id
      from public.show_sessions where show_id = p_show_id;
    if v_session_count = 1 then
      null; -- v_session_id에 그 하나뿐인 회차 id가 이미 들어있음(min(id))
    elsif v_session_count > 1 then
      return jsonb_build_object('ok', false, 'reason', 'session_required');
    else
      v_session_id := null; -- 회차 0개 — 이 공연은 아직 회차 기능 미사용(레거시 경로)
    end if;
  end if;

  -- 정원 계산 단위(회차 또는 공연 전체)에 맞춰 직렬화 — 이후 모든 조회·삽입이 이 락 안에서
  -- 일어나야 동시 신청에도 정원을 넘기지 않는다(기존과 동일한 advisory lock 패턴).
  perform pg_advisory_xact_lock(hashtext(coalesce(v_session_id, p_show_id)::text));

  select capacity, reservation_closed into v_show_capacity, v_closed
    from public.shows where id = p_show_id and status = 'approved';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'show_not_found');
  end if;
  if v_closed then
    return jsonb_build_object('ok', false, 'reason', 'reservation_closed');
  end if;

  if v_session_id is not null then
    select show_id, capacity into v_session_show_id, v_session_capacity
      from public.show_sessions where id = v_session_id;
    if not found or v_session_show_id is distinct from p_show_id then
      return jsonb_build_object('ok', false, 'reason', 'session_not_found');
    end if;
    -- 회차 정원이 없으면(null) 공연 전체 정원을 그대로 상속
    v_capacity := coalesce(v_session_capacity, v_show_capacity);
    select coalesce(sum(party_size), 0) into v_confirmed
      from public.syus_reservations where session_id = v_session_id and status = 'confirmed';
  else
    v_capacity := v_show_capacity;
    select coalesce(sum(party_size), 0) into v_confirmed
      from public.syus_reservations where show_id = p_show_id and status = 'confirmed';
  end if;

  v_status := case
    when v_capacity is null then 'confirmed'
    when v_confirmed + p_party_size <= v_capacity then 'confirmed'
    else 'waitlisted'
  end;
  v_code := 'MUOL-' || to_char(now(), 'MMDD') || '-' || lpad((floor(random() * 1000))::int::text, 3, '0');

  insert into public.syus_reservations
    (show_id, session_id, user_id, guest_name, guest_contact, party_size, status, reservation_code)
  values
    (p_show_id, v_session_id, v_uid, p_guest_name, p_guest_contact, p_party_size, v_status, v_code);

  return jsonb_build_object('ok', true, 'status', v_status, 'code', v_code, 'session_id', v_session_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 5) cancel_reservation() 재작성 — 대기 승격을 회차 단위로 좁힌다
--    (시그니처 불변 — text, text default null — 이므로 DROP 없이 그냥 REPLACE)
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.cancel_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_promoted jsonb := '[]'::jsonb;
  v_show_capacity int;
  v_session_capacity int;
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

  -- 이 신청이 속한 회차(있으면) 또는 공연 전체 단위로 직렬화 — submit_reservation과 동일한
  -- 락 키 규칙이라야 회차 A 취소가 회차 B 대기자를 잘못 승격시키지 않는다.
  perform pg_advisory_xact_lock(hashtext(coalesce(v_row.session_id, v_row.show_id)::text));

  select title, capacity, reservation_closed into v_show_title, v_show_capacity, v_closed
    from public.shows where id = v_row.show_id;

  update public.syus_reservations set status = 'cancelled' where id = v_row.id;

  -- 확정 신청이 취소돼 자리가 났고, 공연팀이 수동 마감 중이 아니면 대기자를 순서대로 승격
  if v_row.status = 'confirmed' and not v_closed then
    if v_row.session_id is not null then
      select capacity into v_session_capacity from public.show_sessions where id = v_row.session_id;
      v_capacity := coalesce(v_session_capacity, v_show_capacity);

      if v_capacity is not null then
        select coalesce(sum(party_size), 0) into v_confirmed
          from public.syus_reservations where session_id = v_row.session_id and status = 'confirmed';

        for v_candidate in
          select * from public.syus_reservations
          where session_id = v_row.session_id and status = 'waitlisted'
          order by created_at asc
        loop
          exit when v_confirmed + v_candidate.party_size > v_capacity;
          update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
          v_confirmed := v_confirmed + v_candidate.party_size;
          v_promoted := v_promoted || jsonb_build_object(
            'code', v_candidate.reservation_code, 'contact', v_candidate.guest_contact,
            'name', v_candidate.guest_name, 'party_size', v_candidate.party_size
          );
        end loop;
      end if;
    else
      -- 회차 없음(레거시 경로) — 기존처럼 공연 전체 단위, 회차 없는 신청끼리만 승격 대상
      v_capacity := v_show_capacity;
      if v_capacity is not null then
        select coalesce(sum(party_size), 0) into v_confirmed
          from public.syus_reservations where show_id = v_row.show_id and status = 'confirmed';

        for v_candidate in
          select * from public.syus_reservations
          where show_id = v_row.show_id and session_id is null and status = 'waitlisted'
          order by created_at asc
        loop
          exit when v_confirmed + v_candidate.party_size > v_capacity;
          update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
          v_confirmed := v_confirmed + v_candidate.party_size;
          v_promoted := v_promoted || jsonb_build_object(
            'code', v_candidate.reservation_code, 'contact', v_candidate.guest_contact,
            'name', v_candidate.guest_name, 'party_size', v_candidate.party_size
          );
        end loop;
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'promoted', v_promoted, 'show_id', v_row.show_id, 'show_title', v_show_title);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 6) lookup_reservation() 재작성 — session_at 포함, 대기 순번도 회차 단위로 좁힘
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.lookup_reservation(p_code text, p_contact text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_position int;
begin
  select r.*, s.title as show_title, s.schedule_start, s.schedule_end, ss.session_at as session_at
    into v_row
    from public.syus_reservations r
    join public.shows s on s.id = r.show_id
    left join public.show_sessions ss on ss.id = r.session_id
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
    if v_row.session_id is not null then
      select count(*) + 1 into v_position
        from public.syus_reservations
        where session_id = v_row.session_id and status = 'waitlisted' and created_at < v_row.created_at;
    else
      select count(*) + 1 into v_position
        from public.syus_reservations
        where show_id = v_row.show_id and session_id is null and status = 'waitlisted' and created_at < v_row.created_at;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'show_title', v_row.show_title,
    'schedule_start', v_row.schedule_start,
    'schedule_end', v_row.schedule_end,
    'session_at', v_row.session_at,
    'party_size', v_row.party_size,
    'status', v_row.status,
    'code', v_row.reservation_code,
    'waitlist_position', v_position
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 7) get_my_waitlist_positions() 재작성 — 회차 단위로 좁힘
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.get_my_waitlist_positions()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'position', t.pos)), '[]'::jsonb)
  from (
    select r.id,
      (select count(*) from public.syus_reservations w
         where w.status = 'waitlisted'
           and (
             (r.session_id is not null and w.session_id = r.session_id)
             or (r.session_id is null and w.show_id = r.show_id and w.session_id is null)
           )
           and w.created_at < r.created_at
      ) + 1 as pos
    from public.syus_reservations r
    where r.user_id = auth.uid() and r.status = 'waitlisted'
  ) t;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 8) get_show_reservation_summary() 재작성 — 시그니처(p_show_id 하나)는 그대로 두고
--    'sessions' 배열만 덧붙인다. 기존 필드(confirmed_total/capacity/reservation_closed)는
--    "공연 전체 합계"로 계속 유효해 기존 호출부는 손대지 않아도 그대로 동작한다.
--    마이그레이션 이전엔 이 함수가 'sessions' 필드 자체를 안 주므로, 프런트는 그 필드의
--    유무로 "회차 기능이 켜졌는지"를 스스로 감지한다(재배포 불필요).
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.get_show_reservation_summary(p_show_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'confirmed_total', coalesce((
      select sum(party_size) from public.syus_reservations
      where show_id = p_show_id and status = 'confirmed'
    ), 0),
    'capacity', (select capacity from public.shows where id = p_show_id),
    'reservation_closed', (select reservation_closed from public.shows where id = p_show_id),
    'sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ss.id,
          'session_at', ss.session_at,
          'capacity', ss.capacity,
          'effective_capacity', coalesce(ss.capacity, (select capacity from public.shows where id = p_show_id)),
          'confirmed_total', coalesce((
            select sum(r.party_size) from public.syus_reservations r
            where r.session_id = ss.id and r.status = 'confirmed'
          ), 0)
        ) order by ss.session_at asc
      )
      from public.show_sessions ss
      where ss.show_id = p_show_id
    ), '[]'::jsonb)
  );
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 9) 정원 변경 시 대기 승격 트리거 — 회차 단위로 재정비
--    기존 트리거(shows.capacity/reservation_closed 변경)는 "회차 없는(레거시) 신청"만
--    재계산하도록 좁히고, 공연 정원을 상속하는(capacity가 null인) 회차들도 함께 재계산한다.
-- ─────────────────────────────────────────────────────────────────────
create or replace function public.syus_promote_waitlist_on_capacity_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_confirmed int;
  v_candidate record;
  v_session record;
begin
  perform pg_advisory_xact_lock(hashtext(new.id::text));

  if new.reservation_closed then
    return new; -- 수동 마감 중엔 승격하지 않음
  end if;

  -- 9-1) 회차 없는(레거시) 신청 — 공연 전체 정원 기준
  if new.capacity is null then
    update public.syus_reservations set status = 'confirmed'
      where show_id = new.id and session_id is null and status = 'waitlisted';
  else
    select coalesce(sum(party_size), 0) into v_confirmed
      from public.syus_reservations where show_id = new.id and session_id is null and status = 'confirmed';
    for v_candidate in
      select * from public.syus_reservations
      where show_id = new.id and session_id is null and status = 'waitlisted'
      order by created_at asc
    loop
      exit when v_confirmed + v_candidate.party_size > new.capacity;
      update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
      v_confirmed := v_confirmed + v_candidate.party_size;
    end loop;
  end if;

  -- 9-2) 공연 정원을 상속(capacity가 null)하는 회차들 — 공연 정원이 바뀌었으니 재계산
  for v_session in
    select id from public.show_sessions where show_id = new.id and capacity is null
  loop
    perform pg_advisory_xact_lock(hashtext(v_session.id::text));
    if new.capacity is null then
      update public.syus_reservations set status = 'confirmed'
        where session_id = v_session.id and status = 'waitlisted';
    else
      select coalesce(sum(party_size), 0) into v_confirmed
        from public.syus_reservations where session_id = v_session.id and status = 'confirmed';
      for v_candidate in
        select * from public.syus_reservations
        where session_id = v_session.id and status = 'waitlisted'
        order by created_at asc
      loop
        exit when v_confirmed + v_candidate.party_size > new.capacity;
        update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
        v_confirmed := v_confirmed + v_candidate.party_size;
      end loop;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists syus_shows_capacity_promote on public.shows;
create trigger syus_shows_capacity_promote
  after update of capacity, reservation_closed on public.shows
  for each row
  when (
    new.capacity is distinct from old.capacity
    or new.reservation_closed is distinct from old.reservation_closed
  )
  execute function public.syus_promote_waitlist_on_capacity_change();

-- 신규: 회차 자체의 정원을 바꿨을 때도 그 회차의 대기자를 재계산(공연 정원 변경 트리거와
-- 대칭). 공연이 수동 마감 중이면 승격하지 않는다(재개는 "예약 다시 열기"로 명시적으로).
create or replace function public.syus_promote_waitlist_on_session_capacity_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_confirmed int;
  v_candidate record;
  v_effective_capacity int;
  v_show_closed boolean;
begin
  perform pg_advisory_xact_lock(hashtext(new.id::text));

  select reservation_closed into v_show_closed from public.shows where id = new.show_id;
  if v_show_closed then
    return new;
  end if;

  select coalesce(new.capacity, capacity) into v_effective_capacity
    from public.shows where id = new.show_id;

  if v_effective_capacity is null then
    update public.syus_reservations set status = 'confirmed'
      where session_id = new.id and status = 'waitlisted';
    return new;
  end if;

  select coalesce(sum(party_size), 0) into v_confirmed
    from public.syus_reservations where session_id = new.id and status = 'confirmed';

  for v_candidate in
    select * from public.syus_reservations
    where session_id = new.id and status = 'waitlisted'
    order by created_at asc
  loop
    exit when v_confirmed + v_candidate.party_size > v_effective_capacity;
    update public.syus_reservations set status = 'confirmed' where id = v_candidate.id;
    v_confirmed := v_confirmed + v_candidate.party_size;
  end loop;

  return new;
end;
$$;

drop trigger if exists syus_show_sessions_capacity_promote on public.show_sessions;
create trigger syus_show_sessions_capacity_promote
  after update of capacity on public.show_sessions
  for each row
  when (new.capacity is distinct from old.capacity)
  execute function public.syus_promote_waitlist_on_session_capacity_change();

-- ─────────────────────────────────────────────────────────────────────
-- 완료. 운영자 액션
--   1) 이 SQL을 Supabase SQL Editor에 통째로 붙여넣고 Run (1회, 재실행해도 안전)
--   2) 별도로 재배포할 필요 없음 — 이미 배포돼 있는 프런트가 다음 폴링부터 자동으로
--      회차 기능을 인식한다.
--   3) 실행 후 확인: 공연자 페이지 → 아무 공연이나 "수정"으로 열어보면 회차가 1개
--      자동으로 채워져 있어야 정상(백필 확인).
-- ─────────────────────────────────────────────────────────────────────
