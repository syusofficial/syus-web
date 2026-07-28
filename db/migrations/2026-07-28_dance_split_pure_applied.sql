-- 2026-07-28: 최상위 장르 "무용" → "순수무용" / "실용무용" 분리
-- 원인·결정:
--   1) 사장님 결정 — 최상위 장르에서 "무용"을 없애고 "순수무용"·"실용무용" 두 개로 대체
--      - 순수무용 sub: 한국무용 / 발레 / 현대무용
--      - 실용무용 sub: 대중무용 / 댄스
--   2) GENRES 배열 내 위치는 기존 "무용" 자리를 그대로 이어받아 인접 배치
--      (연극, 뮤지컬, 순수무용, 실용무용, 국악, 음악, 전통연희, 기타)
--   3) 코드 쪽(src/lib/constants.ts)은 이미 반영됨 — 이 SQL은 DB에 이미 쌓인
--      genre='무용' 행을 genre_detail 값에 따라 재분류하는 백업/참고용 스크립트.
--
-- 실행 시점: 지금 당장은 필요 없음(2026-07-28 기준 무용 등록 0건 확인).
-- 나중에 "무용"으로 등록된 공연이 쌓인 뒤, 사장님이 Supabase SQL Editor에서
-- 필요할 때 직접 실행한다. 이 파일은 실행되지 않은 채로 커밋만 됨.

-- 1) 예외 행 확인(먼저 실행 권장) — genre_detail이 비어있거나 5개 값
--    (한국무용/발레/현대무용/대중무용/댄스) 중 하나가 아닌 "무용" 행을 나열.
--    이 행들은 자동 분류 대상에서 제외되므로, 아래 UPDATE 실행 전에
--    사장님이 직접 확인하고 genre_detail을 채우거나 개별적으로 처리해야 한다.
SELECT id, title, genre, genre_detail, organizer_id, created_at
FROM shows
WHERE genre = '무용'
  AND (
    genre_detail IS NULL
    OR TRIM(genre_detail) = ''
    OR genre_detail NOT IN ('한국무용', '발레', '현대무용', '대중무용', '댄스')
  )
ORDER BY created_at;

-- 2) 순수무용으로 재분류 — genre_detail이 한국무용/발레/현대무용인 행
UPDATE shows
SET genre = '순수무용'
WHERE genre = '무용'
  AND genre_detail IN ('한국무용', '발레', '현대무용');

-- 3) 실용무용으로 재분류 — genre_detail이 대중무용/댄스인 행
UPDATE shows
SET genre = '실용무용'
WHERE genre = '무용'
  AND genre_detail IN ('대중무용', '댄스');

-- 4) 검증 쿼리 (선택 — 적용 후 결과 확인용)
-- SELECT genre, genre_detail, COUNT(*) FROM shows
-- WHERE genre IN ('순수무용', '실용무용') OR genre = '무용'
-- GROUP BY genre, genre_detail
-- ORDER BY genre, genre_detail;

-- 주의: 1)에서 나열된 예외 행은 위 UPDATE 2)·3)이 건드리지 않으므로
-- genre='무용'인 채로 남는다. 이 상태로는 화면상 필터가 "순수무용"/"실용무용"
-- 뿐이라 노출되지 않을 수 있으니, 사장님이 genre_detail을 정정한 뒤 이 SQL을
-- 다시 실행하거나 수동으로 genre를 갱신해야 한다.
