-- 공연자가 직접 "예약 마감(매진)" 처리할 수 있는 기능 — shows.reservation_closed 추가
-- 배경: 정원 자동 마감(capacity 도달 시 waitlisted 전환)과 별개로, 공연팀이
-- 사정상 스스로 예약을 닫고 싶을 때를 위한 수동 스위치.
-- true면 공연 상세페이지에서 좌석 신청 자체를 막고 "예약 마감" 표시.
-- 실행: Supabase SQL Editor에서 1회.

alter table public.shows add column if not exists reservation_closed boolean not null default false;
comment on column public.shows.reservation_closed is '공연팀이 직접 예약을 마감(매진 처리)했는지 여부. true면 신규 좌석 신청 차단.';

-- 공연 상세페이지에서 실시간으로 마감 여부·정원 변화를 반영하려면 shows 테이블도
-- Realtime publication에 등록돼 있어야 한다. 이미 등록돼 있으면 에러 없이 건너뜀.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shows'
  ) then
    alter publication supabase_realtime add table public.shows;
  end if;
end $$;

-- 매진 여부는 누구나(비로그인 방문자 포함) 판단할 수 있어야 하는데, syus_reservations의
-- RLS는 신청자 본인·공연 등록자·운영자만 행을 읽을 수 있다. 개별 신청자 정보(이름·연락처)는
-- 감추면서 "확정 합계"만 공개로 노출하기 위한 security definer 집계 함수.
create or replace function public.get_show_reservation_summary(p_show_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'confirmed_total', coalesce((
      select sum(party_size) from public.syus_reservations
      where show_id = p_show_id and status = 'confirmed'
    ), 0),
    'capacity', (select capacity from public.shows where id = p_show_id),
    'reservation_closed', (select reservation_closed from public.shows where id = p_show_id)
  );
$$;
