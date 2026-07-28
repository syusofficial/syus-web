-- 2026-07-28 백업 — auth.users 가입 시 profiles row를 자동 생성하는 트리거/함수.
--
-- 이 파일은 코드 저장소에 버전관리가 안 되고 있던 Supabase 대시보드 전용 설정을
-- 백업 목적으로 캡처한 것이다 (회원가입 절차 감사 중 발견된 구조적 공백, 2026-07-28).
-- 정본은 여전히 Supabase 프로젝트 자체(SQL Editor로 직접 만들어짐)이며,
-- 이 파일을 그냥 실행한다고 자동으로 반영되는 게 아니다 — 실수로 트리거/함수가
-- 지워지거나 바뀐 것을 발견했을 때, 아래 SQL을 Supabase SQL Editor에서
-- 그대로 실행해 복구하는 용도다.
--
-- 조회 방법(다음에 다시 백업하거나 실제로 맞는지 검증할 때):
--   select pg_get_triggerdef(t.oid) from pg_trigger t
--     join pg_class c on c.oid = t.tgrelid
--     join pg_namespace n on n.oid = c.relnamespace
--    where not t.tgisinternal and n.nspname = 'auth' and c.relname = 'users';
--   select pg_get_functiondef(p.oid) from pg_proc p
--     join pg_namespace n on n.oid = p.pronamespace
--    where p.proname = 'handle_new_user';

-- 함수: 가입 즉시 profiles row 생성.
-- name은 소셜 로그인 provider별 metadata 키 우선순위(name > full_name > nickname >
-- preferred_username)로 채우고, 전부 없으면 이메일 앞부분(@ 이전)을 사용한다.
-- 2026-07-28 연령 제한 완화 이후 이 함수는 birth_date를 전혀 다루지 않는다는 것도
-- 이 백업으로 확인됨 — 코드에서 생년월일 수집을 중단해도 가입 흐름에 영향 없음.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nickname',
      new.raw_user_meta_data->>'preferred_username',
      split_part(coalesce(new.email, '회원'), '@', 1)
    )
  );
  return new;
end;
$function$;

-- 트리거: auth.users에 신규 계정이 INSERT될 때마다(가입 방법 무관 — 이메일/구글/카카오
-- 전부 auth.users INSERT를 거치므로) 위 함수를 1회 실행.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
