-- ┌────────────────────────────────────────────────────────────────────────┐
-- │ 끝난 공연에는 좌석 신청이 들어오지 않게 — submit_reservation 종료일 가드    │
-- │ 2026-09-11                                                             │
-- └────────────────────────────────────────────────────────────────────────┘
--
-- 배경
--   2026-09-10 전면 점검에서 나온 구멍입니다. 이미 끝난 공연에도 관객이 좌석 신청을
--   넣을 수 있었고, 신청번호 발급과 확인 메일까지 그대로 나갔습니다.
--   그날 공연 상세 화면(SeatReservationForm)에서는 폼을 감춰 막았지만,
--   신청을 실제로 받는 DB 함수(submit_reservation)에는 종료일 검사가 없습니다.
--   그래서 폼을 미리 열어둔 채 날이 바뀌었거나, 화면을 거치지 않고 호출하면
--   지금도 접수됩니다. "클라이언트를 믿지 않는다" 원칙대로 서버에서도 같은 판정을 겁니다.
--
--   이 가드는 예시 공연 노출 여부와 무관하게 필요합니다. 진짜 공연이 들어와도
--   공연이 끝난 다음 날부터 똑같이 열려 있는 구멍입니다.
--
-- 판정 기준 — src/lib/showFilters.ts 의 isEnded() 와 똑같이 맞춥니다
--   1) 종료일(schedule_end)을 보고, 비어 있으면 시작일(schedule_start)을 봅니다
--   2) 둘 다 비어 있으면 → 막지 않습니다 (날짜 미정 공연까지 차단하면 안 됩니다)
--   3) 날짜로 읽히지 않으면 → 막지 않습니다 ("미정", "5월 둘째 주" 등 — 기존 동작 유지)
--   4) 읽힌 날짜가 한국 기준 오늘보다 **이전**이면 → 막습니다
--   공연 마지막 날 당일은 막지 않습니다. 그날 저녁 공연의 현장 신청이 살아 있어야 합니다.
--
-- 베이스 (중요)
--   현재 살아 있는 submit_reservation 은 db/migrations/2026-07-24_show_sessions_b1.sql 의
--   **5-인자(회차) 버전**입니다. supabase/syus_reservations_closed_guard.sql 의 4-인자
--   버전은 그보다 앞선 것이라 그 파일을 다시 실행하면 회차 기능이 사라집니다.
--   아래 함수는 b1 버전을 그대로 옮기고 종료 검사 두 줄만 얹은 것입니다.
--
-- 실행 방법
--   Supabase → SQL Editor → [1단계]부터 순서대로. [3단계] 확인 쿼리까지 보시면 됩니다.
--   실행 시간은 1초 안쪽이고, 기존 예약 데이터는 하나도 건드리지 않습니다.


-- ═══════════════════════════════════════════════════════════════════════
-- [1단계] 종료 판정 함수 — 판정을 한 곳에 모읍니다
-- ═══════════════════════════════════════════════════════════════════════
-- 날짜 파싱은 이미 있는 public.syus_try_parse_date(2026-07-24 파일에서 생성)를 씁니다.
-- 새 파싱 규칙을 여기서 또 만들지 않습니다 — 화면과 서버가 서로 다른 날짜를 보게 되는
-- 일이 바로 이 프로젝트가 한 번 겪은 사고입니다.

create or replace function public.syus_show_ended(
  p_schedule_start text,
  p_schedule_end   text
) returns boolean
language plpgsql
stable
as $$
declare
  v_raw    text;
  v_parsed timestamptz;
begin
  -- 종료일 우선, 없으면 시작일 (isEnded 와 동일한 순서)
  v_raw := coalesce(
    nullif(trim(coalesce(p_schedule_end, '')), ''),
    nullif(trim(coalesce(p_schedule_start, '')), '')
  );

  if v_raw is null then
    return false;   -- 날짜 자체가 없음 → 진행 중으로 본다
  end if;

  v_parsed := public.syus_try_parse_date(v_raw);
  if v_parsed is null then
    return false;   -- 날짜로 읽히지 않음 → 진행 중으로 본다 (기존 데이터 보호)
  end if;

  -- 저장된 문자열이 가리키던 "그 날짜"로 되돌린 뒤(왕복 변환), 한국 기준 오늘과 비교.
  -- at time zone 없이 ::date 로 자르면 UTC 로 밀려 하루가 어긋납니다.
  return (v_parsed at time zone current_setting('TimeZone'))::date
         < (now() at time zone 'Asia/Seoul')::date;
end;
$$;

comment on function public.syus_show_ended(text, text) is
  '공연이 끝났는지 판정 (src/lib/showFilters.ts 의 isEnded 와 동일 규칙). 날짜가 없거나 읽히지 않으면 false = 진행 중.';


-- ═══════════════════════════════════════════════════════════════════════
-- [2단계] submit_reservation 재생성 — 회차 버전 + 종료 검사
-- ═══════════════════════════════════════════════════════════════════════
-- 혹시 예전 4-인자 버전이 남아 있으면 "함수가 모호함" 오류가 나므로 먼저 정리합니다.
-- (2026-07-24 파일에서 이미 지웠다면 아무 일도 일어나지 않습니다.)
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
  v_schedule_start text;   -- ★ 2026-09-11 추가
  v_schedule_end   text;   -- ★ 2026-09-11 추가
  v_session_at timestamptz; -- ★ 2026-09-11 추가
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

  select capacity, reservation_closed, schedule_start, schedule_end
    into v_show_capacity, v_closed, v_schedule_start, v_schedule_end
    from public.shows where id = p_show_id and status = 'approved';
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'show_not_found');
  end if;
  if v_closed then
    return jsonb_build_object('ok', false, 'reason', 'reservation_closed');
  end if;

  -- ★ 2026-09-11 추가 — 이미 끝난 공연은 여기서 멈춘다.
  --   (화면은 폼을 감추지만, 폼을 열어둔 채 날이 바뀐 경우·직접 호출을 여기서 막는다)
  if public.syus_show_ended(v_schedule_start, v_schedule_end) then
    return jsonb_build_object('ok', false, 'reason', 'show_ended');
  end if;

  if v_session_id is not null then
    select show_id, capacity, session_at
      into v_session_show_id, v_session_capacity, v_session_at
      from public.show_sessions where id = v_session_id;
    if not found or v_session_show_id is distinct from p_show_id then
      return jsonb_build_object('ok', false, 'reason', 'session_not_found');
    end if;

    -- ★ 2026-09-11 추가 — 공연 전체는 남아 있어도 그 회차가 이미 지났으면 막는다.
    --   날짜 단위로만 비교한다(시각까지 보면 당일 공연 시작 뒤 현장 신청이 막힌다).
    if (v_session_at at time zone 'Asia/Seoul')::date < (now() at time zone 'Asia/Seoul')::date then
      return jsonb_build_object('ok', false, 'reason', 'session_ended');
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


-- ═══════════════════════════════════════════════════════════════════════
-- [3단계] 확인 — 실행 후 아래 세 쿼리를 돌려보세요
-- ═══════════════════════════════════════════════════════════════════════
--
-- 3-1) 함수가 5-인자 하나만 남았는지 (여러 줄 나오면 오버로드가 생긴 것 = 이상)
--
--   select p.oid::regprocedure as 함수
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.proname = 'submit_reservation';
--
--
-- 3-2) 지금 있는 공연들이 각각 어떻게 판정되는지 눈으로 확인
--      (현재 shows 5건은 전부 "(예시자료)" + rejected 이므로 승인 공연은 0건입니다.
--       status 와 무관하게 판정만 보려고 일부러 조건을 걸지 않았습니다.)
--
--   select title, status, schedule_start, schedule_end,
--          public.syus_show_ended(schedule_start, schedule_end) as 끝난공연인가
--   from public.shows
--   order by created_at desc;
--
--
-- 3-3) 판정이 오늘 기준으로 맞는지 (경계값 점검 — 어제/오늘/내일)
--      기대: 어제 true · 오늘 false · 내일 false · 읽을 수 없는 값 false
--
--   select
--     public.syus_show_ended(null, to_char((now() at time zone 'Asia/Seoul')::date - 1, 'YYYY-MM-DD')) as 어제,
--     public.syus_show_ended(null, to_char((now() at time zone 'Asia/Seoul')::date,     'YYYY-MM-DD')) as 오늘,
--     public.syus_show_ended(null, to_char((now() at time zone 'Asia/Seoul')::date + 1, 'YYYY-MM-DD')) as 내일,
--     public.syus_show_ended(null, '미정')     as 미정,
--     public.syus_show_ended(null, '2026.5.10') as 옛형식_지난날,
--     public.syus_show_ended(null, null)        as 날짜없음;
--
--
-- ═══════════════════════════════════════════════════════════════════════
-- [되돌리기]
-- ═══════════════════════════════════════════════════════════════════════
-- 종료 가드를 걷어내려면 db/migrations/2026-07-24_show_sessions_b1.sql 의
-- "4) submit_reservation() 재작성" 블록을 다시 실행하면 원래대로 돌아갑니다.
-- 판정 함수도 함께 지우려면:
--
--   drop function if exists public.syus_show_ended(text, text);
--
-- (다른 곳에서 쓰기 시작했다면 남겨두셔도 무해합니다 — 조회만 하는 함수입니다.)
