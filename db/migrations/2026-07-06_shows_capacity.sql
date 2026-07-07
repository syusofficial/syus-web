-- 자체 예매(좌석 신청) 시스템 도입 — shows 테이블에 정원·자체예약 사용 여부 컬럼 추가
-- 배경: 무대올림이 외부 링크(reservation_url)로만 연결하던 구조에서, 사이트 안에서
-- 좌석 신청이 완결되는 자체 시스템으로 확장. capacity는 선택(null=무제한).
-- 실행: Supabase SQL Editor에서 1회.

alter table public.shows add column if not exists capacity int;
alter table public.shows add column if not exists use_inhouse_reservation boolean not null default true;

comment on column public.shows.capacity is '좌석 정원(선택). null이면 무제한.';
comment on column public.shows.use_inhouse_reservation is '무대올림 자체 예약 시스템 사용 여부. false면 reservation_url(자체 폼) 링크로 대체.';
