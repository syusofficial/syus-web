-- ─────────────────────────────────────────────────────────────────────────────
-- profiles · shows · contacts — 현재 테이블 정의 + RLS 정책 한 번에 뽑기 (조회 전용)
-- 작성 2026-09-28 제작팀
--
-- 왜: 세 핵심 테이블의 정의·RLS 정책이 repo 어디에도 SQL로 남아 있지 않다
--     (시우스 테이블은 supabase/syus_community_full.sql 에 있지만, 이 셋은 대시보드에서 직접 만들었다).
--     키 이전(2026년 말 레거시 키 폐기) 전에 "지금 운영 DB가 실제로 어떻게 생겼는지"를 기록해 둔다.
--
-- 사용법 (사장님):
--   1) Supabase 대시보드 → SQL Editor → 이 파일 전체를 붙여넣고 Run
--   2) 결과 표 오른쪽 위 「Copy」(또는 Export → CSV)로 복사해 제작팀에 넘겨 주세요
--      → 제작팀이 supabase/ 아래에 정본 SQL로 저장합니다.
--
-- 안전: SELECT 한 문장뿐이다. 데이터·구조를 바꾸는 명령(INSERT/UPDATE/ALTER/DROP)은 없다.
--       결과에 "create table / create policy" 문장이 보이지만, 그건 "글자로 만든 결과물"일 뿐
--       실행되지 않는다. 행 데이터(회원 정보 등)는 한 줄도 읽지 않는다 — 시스템 목록만 본다.
--
-- 결과 순서: 테이블별로 ① 컬럼 정의 ② 제약조건 ③ 인덱스 ④ RLS 켜짐 여부 ⑤ 정책 ⑥ 트리거 ⑦ 권한,
--            마지막에 정책이 부르는 공통 함수(예: is_admin) 정의.
-- ─────────────────────────────────────────────────────────────────────────────

with target(tbl) as (
  values ('profiles'), ('shows'), ('contacts')
),
rel as (
  select c.oid, c.relname::text as tbl, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join target t on t.tbl = c.relname::text
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
result_rows(tbl, ord, sub, line) as (
  -- ⓪ 테이블이 아예 없으면 알림
  select t.tbl, 0, 0, '-- ⚠ public.' || t.tbl || ' 테이블이 없습니다'
  from target t
  where not exists (select 1 from rel r where r.tbl = t.tbl)

  union all
  -- ① 컬럼 정의 (create table 형태)
  select r.tbl, 1, 0,
    'create table public.' || quote_ident(r.tbl) || E' (\n' ||
    coalesce((
      select string_agg(
               '  ' || quote_ident(a.attname::text) || ' ' || format_type(a.atttypid, a.atttypmod)
               || case when a.attnotnull then ' not null' else '' end
               || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''),
               E',\n' order by a.attnum)
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
    ), '') || E'\n);'
  from rel r

  union all
  -- ② 제약조건 (기본키·외래키·check·unique)
  select r.tbl, 2,
    (row_number() over (partition by r.tbl order by con.contype, con.conname))::int,
    'alter table public.' || quote_ident(r.tbl) || ' add constraint ' || quote_ident(con.conname::text)
      || ' ' || pg_get_constraintdef(con.oid) || ';'
  from rel r
  join pg_constraint con on con.conrelid = r.oid

  union all
  -- ③ 인덱스 (제약조건이 자동으로 만든 인덱스는 ②에 이미 포함되므로 제외)
  select r.tbl, 3,
    (row_number() over (partition by r.tbl order by i.indexrelid))::int,
    pg_get_indexdef(i.indexrelid) || ';'
  from rel r
  join pg_index i on i.indrelid = r.oid
  where not exists (select 1 from pg_constraint c2 where c2.conindid = i.indexrelid)

  union all
  -- ④ RLS 켜짐 여부 — 꺼져 있으면 누구나 anon 키로 전 행을 읽고 쓸 수 있다(사고 1순위)
  select r.tbl, 4, 0,
    case when r.relrowsecurity
         then 'alter table public.' || quote_ident(r.tbl) || ' enable row level security;'
         else '-- ⚠ public.' || r.tbl || ' : RLS가 꺼져 있습니다 (row level security OFF)'
    end
    || case when r.relforcerowsecurity
            then E'\nalter table public.' || quote_ident(r.tbl) || ' force row level security;'
            else '' end
  from rel r

  union all
  -- ⑤ RLS 정책 (create policy 형태)
  select p.tablename::text, 5,
    (row_number() over (partition by p.tablename order by p.policyname))::int,
    'create policy ' || quote_ident(p.policyname::text) || ' on public.' || quote_ident(p.tablename::text)
      || ' as ' || lower(p.permissive) || ' for ' || lower(p.cmd)
      || ' to ' || array_to_string(p.roles, ', ')
      || coalesce(E'\n  using (' || p.qual || ')', '')
      || coalesce(E'\n  with check (' || p.with_check || ')', '')
      || ';'
  from pg_policies p
  join target t on t.tbl = p.tablename::text
  where p.schemaname = 'public'

  union all
  -- ⑥ 트리거 (updated_at 자동 갱신 등)
  select r.tbl, 6,
    (row_number() over (partition by r.tbl order by tg.tgname))::int,
    pg_get_triggerdef(tg.oid) || ';'
  from rel r
  join pg_trigger tg on tg.tgrelid = r.oid
  where not tg.tgisinternal

  union all
  -- ⑦ 역할별 표 권한 (anon = 비로그인 방문자, authenticated = 로그인 회원)
  select r.tbl, 7, 0,
    '-- 권한: ' || coalesce((
      select string_agg(g.grantee || '=' || g.privs, ' / ' order by g.grantee)
      from (
        select rtg.grantee::text as grantee,
               string_agg(rtg.privilege_type::text, ',' order by rtg.privilege_type::text) as privs
        from information_schema.role_table_grants rtg
        where rtg.table_schema::text = 'public'
          and rtg.table_name::text = r.tbl
          and rtg.grantee::text in ('anon', 'authenticated', 'service_role')
        group by rtg.grantee::text
      ) g
    ), '(anon·authenticated 권한 없음)')
  from rel r

  union all
  -- ⑧ 위 정책들이 부르는 public 함수 정의 (예: is_admin()) — 정책만 옮기면 함수가 빠져 깨진다
  select '(정책이 쓰는 함수)', 8,
    (row_number() over (order by f.proname))::int,
    pg_get_functiondef(f.oid) || ';'
  from pg_proc f
  join pg_namespace fn on fn.oid = f.pronamespace
  where fn.nspname = 'public'
    and f.prokind = 'f'
    and exists (
      select 1 from pg_policies p
      join target t on t.tbl = p.tablename::text
      where p.schemaname = 'public'
        and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) like '%' || f.proname::text || '(%'
    )
)
select tbl as "테이블", line as "정의"
from result_rows
order by array_position(array['profiles', 'shows', 'contacts']::text[], tbl), ord, sub;
