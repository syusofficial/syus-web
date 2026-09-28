-- ─────────────────────────────────────────────────────────────────────────────
-- shows — 승인 상태·운영자 픽·조회수를 일반 회원이 직접 바꾸지 못하게 막는다 (2026-09-28)
--
-- 문제 (실측: schema_core_tables_2026-09-28.sql)
--   "공연자 공연 등록"(insert) · "공연자 본인 공연 수정"(update) 정책이 organizer_id = 본인인지만 본다.
--   공연자 등록 화면은 브라우저에서 status:"pending"을 넣어 저장하지만, DB는 그 값을 강제하지 않는다.
--   → 로그인한 누구나(공연자 승인 전 회원 포함) 요청을 조작해 status='approved'로 공연을 올리면
--     관리자 승인 없이 곧바로 「승인된 공연 전체 공개」 정책에 걸려 사이트에 뜬다.
--     featured(운영자 픽)·view_count(조회수)도 스스로 바꿀 수 있다.
--
-- 고치는 방식 — 정책은 그대로 두고 BEFORE 트리거 하나를 더한다
--   · 브라우저에서 직접 들어온 요청(current_user = anon / authenticated)이면서 관리자가 아닐 때만 적용
--   · 관리자 화면(관리자 세션) · 서버의 service role(대리 등록 등) · SECURITY DEFINER 함수
--     (increment_show_view 조회수, 예약 함수들)는 current_user가 달라 영향 없음
--   · 등록(INSERT): status='pending' · featured=false · view_count=0으로 고정,
--                  역할이 performer/admin이 아니면 거절 (화면의 공연자 게이트를 DB에서도 보장)
--   · 수정(UPDATE): status는 그대로 두거나 'pending'으로 내리는 것만 허용
--                  (화면의 "큰 수정은 재심사" 흐름과 같음), featured·view_count는 이전 값 유지
--
-- 실행: Supabase SQL Editor에 전체를 붙여넣고 Run. 한 번만. 되돌리기는 맨 아래.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create or replace function public.shows_guard_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- 브라우저 직접 요청이 아니면(서버 service role, SECURITY DEFINER 함수 등) 그대로 통과
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- 관리자는 통과 (관리자 화면의 승인·반려·픽 토글)
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('performer', 'admin')
    ) then
      raise exception '공연자 승인 후에 공연을 등록할 수 있습니다.' using errcode = '42501';
    end if;
    new.status     := 'pending';
    new.featured   := false;
    new.view_count := 0;
    return new;
  end if;

  -- UPDATE
  if new.status is distinct from old.status and new.status <> 'pending' then
    raise exception '공연 상태는 관리자만 바꿀 수 있습니다.' using errcode = '42501';
  end if;
  new.featured   := old.featured;
  new.view_count := old.view_count;
  return new;
end;
$$;

drop trigger if exists shows_guard_privileged_columns on public.shows;
create trigger shows_guard_privileged_columns
  before insert or update on public.shows
  for each row execute function public.shows_guard_privileged_columns();

-- 덤: TRUNCATE는 RLS를 타지 않는다. 브라우저 역할에는 필요 없는 권한이라 회수한다(REST로는 원래 호출 경로 없음).
revoke truncate on public.shows, public.profiles, public.contacts from anon, authenticated;

commit;

-- ── 실행 뒤 확인 (결과 2줄이 보이면 정상) ───────────────────────────────────
select tgname as "트리거", tgenabled as "켜짐(O)"
from pg_trigger where tgrelid = 'public.shows'::regclass and tgname = 'shows_guard_privileged_columns';

select proname as "함수", case when prosecdef then 'SECURITY DEFINER (조회수 정상 동작)' else '⚠ INVOKER — 조회수가 막힐 수 있음, 클로드에 알려 주세요' end as "조회수 함수 권한"
from pg_proc where proname = 'increment_show_view';

-- ── 되돌리기 (문제가 생겼을 때만) ─────────────────────────────────────────
-- drop trigger if exists shows_guard_privileged_columns on public.shows;
-- drop function if exists public.shows_guard_privileged_columns();
-- grant truncate on public.shows, public.profiles, public.contacts to anon, authenticated;
