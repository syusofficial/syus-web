-- 2026-06-17: 장르 세분화 — 발레→무용 흡수 + genre_detail 컬럼 신규
-- 원인·결정:
--   1) "발레는 무용의 한 장르" — 사장님 결정으로 발레를 GENRES에서 제거하고 무용 sub-genre로 통합
--   2) 무용·음악만 sub-genre 도입 (운영팀 추천 옵션 C):
--      - 무용: 발레 / 현대무용 / 한국무용
--      - 음악: 클래식 / 실용음악 / 합창·앙상블
--   3) 국악·연극·뮤지컬·전통연희·기타는 sub-genre 없음
--
-- 사장님이 Supabase SQL Editor에서 한 번 실행하면 적용됩니다.
-- 어제(6/16) reservation_url 컬럼 누락 사고 재발 방지 = 셀프 점검 항목 2 (DB 스키마) 준수.

-- 1) genre_detail 컬럼 추가 (TEXT, nullable)
ALTER TABLE shows ADD COLUMN IF NOT EXISTS genre_detail TEXT;

-- 2) 기존 "발레" 장르 데이터 → "무용" + genre_detail "발레"로 변환
--    (예시 데이터 또는 실제 등록 데이터에 "발레"가 있을 경우 자동 마이그레이션)
UPDATE shows
SET genre = '무용', genre_detail = '발레'
WHERE genre = '발레';

-- 3) 검증 쿼리 (선택 — 적용 후 결과 확인용)
-- SELECT genre, genre_detail, COUNT(*) FROM shows
-- WHERE genre IN ('무용', '음악') OR genre_detail IS NOT NULL
-- GROUP BY genre, genre_detail
-- ORDER BY genre, genre_detail;
