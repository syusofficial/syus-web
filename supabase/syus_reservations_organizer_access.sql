-- 공연자(등록자)가 자기 공연의 예약자 명단(이름·연락처·인원)을 실시간으로 볼 수 있게 함
-- 배경: 2026-07-07 사장님 요청 — 공연자 페이지에서 예약 현황 확인·출력 기능 추가.
-- 기존 syus_rsv read 정책은 본인(user_id)·운영자만 허용했음 — 공연 등록자(organizer_id) 조건 추가.
-- 실행: Supabase SQL Editor에서 1회. supabase/syus_reservations.sql 이후 실행할 것.

drop policy if exists "syus_rsv read" on public.syus_reservations;
create policy "syus_rsv read" on public.syus_reservations for select using (
  auth.uid() = user_id
  or public.syus_is_admin()
  or exists (
    select 1 from public.shows s
    where s.id = syus_reservations.show_id and s.organizer_id = auth.uid()
  )
);

-- 실시간(Realtime) 구독 활성화 — 공연자 페이지에서 새 신청이 즉시 반영되도록.
alter publication supabase_realtime add table public.syus_reservations;
