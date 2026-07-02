-- ─────────────────────────────────────────────────────────────
-- 견해글 질문받기(syus_essay_asks) 삭제 정책
-- 배경(2026-07-02): /syus/admin 질문 인박스에서 불필요한 질문을 지울 수 있게.
--   기존 정책은 insert/select 뿐이라 admin 도 삭제 불가 → 삭제 정책 추가.
--   본인 또는 운영자만 삭제 가능. (QnA 질문 syus_questions 는 이미 admin 삭제 허용)
-- 실행: Supabase SQL Editor 에서 1회. (여러 번 실행해도 안전)
-- ─────────────────────────────────────────────────────────────

drop policy if exists "syus_ea delete" on public.syus_essay_asks;
create policy "syus_ea delete" on public.syus_essay_asks
  for delete using (auth.uid() = user_id or public.syus_is_admin());
