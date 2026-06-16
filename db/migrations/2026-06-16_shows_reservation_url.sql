-- 2026-06-16: shows 테이블에 reservation_url 컬럼 추가
-- 원인: performer 페이지에서 좌석 예약 링크(reservation_url) 입력란이 추가되었으나
--      DB 마이그레이션이 누락되어 공연 등록 시 400 에러 발생.
-- 사장님 Supabase SQL Editor에서 실행 후 적용.

ALTER TABLE shows ADD COLUMN IF NOT EXISTS reservation_url TEXT;

-- 검증 쿼리 (선택, 적용 후 컬럼이 추가되었는지 확인용)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'shows' AND column_name = 'reservation_url';
