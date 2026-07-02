-- ─────────────────────────────────────────────────────────────
-- QnA 답변 채택(is_accepted) 가드 트리거
-- 배경(2026-07-02 보안 점검): syus_answers.is_accepted 가 답변 행에 있고,
--   RLS "syus_a update" 는 답변 작성자에게도 update 를 허용한다(본문 수정 목적).
--   → 답변 작성자가 직접 API 로 자기 답변을 is_accepted=true 로 '자가 채택'할 수 있음.
--   UI 는 질문 작성자에게만 채택 버튼을 노출하지만, RLS 만으로는 컬럼 단위 제한 불가.
-- 이 트리거로 is_accepted 변경은 '질문 작성자 또는 운영자'만 가능하게 강제한다.
-- 실행: Supabase SQL Editor 에서 1회.
-- ─────────────────────────────────────────────────────────────

create or replace function public.syus_guard_answer_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_accepted is distinct from old.is_accepted
     and not public.syus_is_admin()
     and auth.uid() is distinct from
         (select q.user_id from public.syus_questions q where q.id = new.question_id)
  then
    raise exception '답변 채택은 질문 작성자만 변경할 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists syus_answers_accept_guard on public.syus_answers;
create trigger syus_answers_accept_guard
  before update on public.syus_answers
  for each row execute function public.syus_guard_answer_accept();
