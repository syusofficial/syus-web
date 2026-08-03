-- ⚠️ 아직 실행하지 않음 — 사장님 확인 후 실행
-- ┌──────────────────────────────────────────────────────────────────┐
-- │ 공연 날짜 형식 통일 — shows.schedule_start / schedule_end (2026-08-03) │
-- └──────────────────────────────────────────────────────────────────┘
--
-- 배경
--   공연 날짜 두 칸이 오랫동안 자유 텍스트로 입력돼 왔습니다. 그래서 같은 뜻의 날짜가
--   "2026-05-10" / "2026.05.10" / "2026.5.10" / "2026/05/10" 처럼 여러 모양으로 섞여 있고,
--   코드는 이걸 어떤 곳은 글자로, 어떤 곳은 날짜로 비교합니다. 그 결과:
--     · 지난 공연이 아카이브로 안 넘어가고 계속 "진행 중"으로 남고
--     · D-3 / D-1 알림 메일이 조용히 발송되지 않고
--     · 캘린더·정렬이 어긋납니다.
--   에러가 하나도 안 나기 때문에 눈으로는 안 보입니다.
--
--   2026-08-03 자로 등록 폼을 달력 입력(<input type="date">)으로 바꿔 **앞으로 들어오는
--   값은 전부 "YYYY-MM-DD" 한 가지**가 됩니다. 이 파일은 **이미 들어와 있는 옛 데이터**를
--   같은 형식으로 맞추는 정리 작업입니다.
--
-- 실행 방법
--   Supabase → SQL Editor → 아래 [1단계] 부터 순서대로. 한 단계씩 결과를 보고 넘어가세요.
--   전체를 한 번에 붙여넣지 마시고, 1단계 결과를 먼저 확인하시는 걸 권합니다.
--
-- 선행 조건
--   db/migrations/2026-07-24_show_sessions_b1.sql 가 이미 실행돼 있어야 합니다.
--   (거기서 만든 public.syus_try_parse_date 함수를 그대로 씁니다.)
--
--
-- ═══════════════════════════════════════════════════════════════════════
-- [1단계] 실행 전 확인 — 자동으로 못 고치는 행 먼저 눈으로 보기
-- ═══════════════════════════════════════════════════════════════════════
-- 아래 SELECT를 먼저 돌려보세요. 여기에 나오는 행들은 이 스크립트가 **건드리지 않습니다.**
-- (예: "미정", "5월 둘째 주", 연도가 없는 "5.10" 등)
-- 결과가 0건이면 그냥 3단계까지 쭉 진행하시면 됩니다.
-- 몇 건 나온다면 → 공연 제목을 보고 실제 날짜를 아시는 것만 관리자 화면에서 직접 수정하시거나,
-- 그대로 두셔도 됩니다(사이트는 원문을 그대로 보여주고, 종료 판정만 "진행 중"으로 남깁니다).
--
--   select id, title, status, schedule_start, schedule_end
--   from public.shows
--   where
--     (coalesce(trim(schedule_start), '') <> ''
--       and schedule_start !~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$')
--     or
--     (coalesce(trim(schedule_end), '') <> ''
--       and schedule_end !~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$')
--   order by created_at desc;
--
--
-- 바뀌기 전/후를 미리 보고 싶으시면 (실제로 바꾸지 않고 미리보기만):
--
--   select id, title,
--          schedule_start as 시작_현재,
--          to_char(public.syus_try_parse_date(schedule_start)
--                    at time zone current_setting('TimeZone'), 'YYYY-MM-DD') as 시작_바뀔값,
--          schedule_end   as 종료_현재,
--          to_char(public.syus_try_parse_date(schedule_end)
--                    at time zone current_setting('TimeZone'), 'YYYY-MM-DD') as 종료_바뀔값
--   from public.shows
--   where schedule_start ~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$'
--      or schedule_end   ~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$'
--   order by created_at desc;
--
--
-- ═══════════════════════════════════════════════════════════════════════
-- [2단계] 백업 — 되돌릴 수 있게 원본을 따로 떠둡니다 (먼저 실행)
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.shows_schedule_backup_20260803 as
select id, schedule_start, schedule_end, now() as backed_up_at
from public.shows;

-- 백업이 잘 됐는지 확인 (shows 건수와 같아야 합니다)
-- select count(*) from public.shows_schedule_backup_20260803;
-- select count(*) from public.shows;


-- ═══════════════════════════════════════════════════════════════════════
-- [3단계] 정규화 — 날짜로 확실히 읽히는 값만 "YYYY-MM-DD"로 통일
-- ═══════════════════════════════════════════════════════════════════════
-- 안전장치 3겹:
--   ① 정규식으로 "네 자리 연도 + 구분자 + 월 + 구분자 + 일" 모양인 값만 대상으로 삼습니다.
--      ("미정" 같은 값은 애초에 후보에서 빠집니다)
--   ② syus_try_parse_date가 실제로 날짜를 읽어낸 경우에만 바꿉니다(못 읽으면 null → 제외).
--   ③ 바꾼 결과가 원래 값과 다를 때만 씁니다(불필요한 updated_at 갱신 방지).
--   at time zone current_setting('TimeZone') 은 캐스팅할 때 쓴 시간대로 그대로 되돌리는
--   왕복 변환입니다. 이게 없으면 시간대 차이로 하루가 밀릴 수 있습니다.

-- 3-1) 시작일
update public.shows
set schedule_start = to_char(
      public.syus_try_parse_date(schedule_start) at time zone current_setting('TimeZone'),
      'YYYY-MM-DD'
    )
where schedule_start ~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$'
  and public.syus_try_parse_date(schedule_start) is not null
  and schedule_start <> to_char(
        public.syus_try_parse_date(schedule_start) at time zone current_setting('TimeZone'),
        'YYYY-MM-DD'
      );

-- 3-2) 종료일
update public.shows
set schedule_end = to_char(
      public.syus_try_parse_date(schedule_end) at time zone current_setting('TimeZone'),
      'YYYY-MM-DD'
    )
where schedule_end ~ '^\s*\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}\s*$'
  and public.syus_try_parse_date(schedule_end) is not null
  and schedule_end <> to_char(
        public.syus_try_parse_date(schedule_end) at time zone current_setting('TimeZone'),
        'YYYY-MM-DD'
      );


-- ═══════════════════════════════════════════════════════════════════════
-- [4단계] 실행 후 확인
-- ═══════════════════════════════════════════════════════════════════════
-- 아직 "YYYY-MM-DD"가 아닌 값이 남아 있는지 — 여기 나오는 건 1단계에서 본 손볼 수 없는 행들입니다.
--
--   select id, title, status, schedule_start, schedule_end
--   from public.shows
--   where (coalesce(trim(schedule_start), '') <> '' and schedule_start !~ '^\d{4}-\d{2}-\d{2}$')
--      or (coalesce(trim(schedule_end),   '') <> '' and schedule_end   !~ '^\d{4}-\d{2}-\d{2}$')
--   order by created_at desc;
--
-- 종료일이 시작일보다 빠른 이상한 행이 있는지도 함께 봐두시면 좋습니다.
--
--   select id, title, schedule_start, schedule_end
--   from public.shows
--   where schedule_start ~ '^\d{4}-\d{2}-\d{2}$'
--     and schedule_end   ~ '^\d{4}-\d{2}-\d{2}$'
--     and schedule_end < schedule_start;
--
--
-- ═══════════════════════════════════════════════════════════════════════
-- [되돌리기] 뭔가 잘못됐을 때 — 2단계 백업으로 원상복구
-- ═══════════════════════════════════════════════════════════════════════
-- 아래를 실행하면 [3단계] 이전 상태로 완전히 돌아갑니다.
--
--   update public.shows s
--   set schedule_start = b.schedule_start,
--       schedule_end   = b.schedule_end
--   from public.shows_schedule_backup_20260803 b
--   where s.id = b.id;
--
-- 되돌릴 일이 없다고 판단되면(권장: 2주 이상 지켜본 뒤) 백업 테이블을 지웁니다.
--
--   drop table if exists public.shows_schedule_backup_20260803;
--
--
-- ═══════════════════════════════════════════════════════════════════════
-- [선택 / 지금은 실행하지 마세요] 앞으로 형식이 다시 흐트러지지 않게 잠그기
-- ═══════════════════════════════════════════════════════════════════════
-- 아래 CHECK 제약을 걸면 DB 차원에서 "YYYY-MM-DD"가 아닌 값의 저장을 막습니다.
-- 다만 [4단계]에서 정리 못 한 행이 하나라도 남아 있으면 제약 추가 자체가 실패하고,
-- 그 뒤로는 그 공연을 수정 저장할 때마다 오류가 납니다.
-- 그래서 ① 4단계 결과가 0건이고 ② 새 등록 폼(달력 입력)이 배포된 뒤에만 거세요.
--
--   alter table public.shows
--     add constraint shows_schedule_start_format
--     check (schedule_start is null or schedule_start ~ '^\d{4}-\d{2}-\d{2}$');
--
--   alter table public.shows
--     add constraint shows_schedule_end_format
--     check (schedule_end is null or schedule_end ~ '^\d{4}-\d{2}-\d{2}$');
--
-- 되돌리기:
--   alter table public.shows drop constraint if exists shows_schedule_start_format;
--   alter table public.shows drop constraint if exists shows_schedule_end_format;
