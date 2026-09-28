-- ─────────────────────────────────────────────────────────────────────────────
-- profiles · shows · contacts — 운영 DB 실측 정의 (기록 전용, 실행하지 말 것)
-- 출처: 2026-09-28 사장님이 SQL Editor에서 inspect_core_tables_readonly_2026-09-28.sql 실행 → 결과 전달
--
-- 왜: 이 세 테이블은 대시보드에서 직접 만들어 repo에 정의가 없었다.
--     2026년 말 Supabase 레거시 키 폐기 전에 "지금 운영 DB가 실제로 어떻게 생겼는지"를 남긴다.
--     이 파일은 기록이다. 새 환경을 만들 때 참고할 수는 있지만 운영 DB에 다시 돌리지 않는다.
--
-- 실측에서 발견한 것 (2026-09-28)
--   ① shows 등록·수정 정책이 organizer_id만 검사하고 status·featured·view_count는 막지 않는다
--      → 로그인한 누구나(공연자 승인 전 포함) 조작된 요청으로 status='approved'인 공연을 바로 공개할 수 있다.
--      수정 SQL: fix_shows_privileged_columns_2026-09-28.sql
--   ② anon·authenticated에 세 테이블 TRUNCATE 권한이 있다(Supabase 기본값). TRUNCATE는 RLS를 타지 않는다.
--      REST API로는 호출 경로가 없어 즉시 위험은 낮지만 같은 수정 SQL에서 회수한다.
--   ③ profiles에 역할 변경 방지 트리거가 두 개(enforce_role_change_policy · trg_prevent_profile_role_change) 겹쳐 있다. 정리 대상(급하지 않음).
--   ④ profiles_birth_date_age_check(만14세) 제약이 남아 있다. 2026-07-28 생년월일 수집 중단 뒤로는 null만 들어와 영향 없음.
-- ─────────────────────────────────────────────────────────────────────────────

-- ═════════════ public.is_admin() — 아래 정책들이 부르는 함수 ═════════════
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$function$;

-- ═════════════ profiles ═════════════
create table public.profiles (
  id uuid not null,
  email text,
  name text,
  role text not null default 'member'::text,
  created_at timestamp with time zone default now(),
  performer_status text,
  welcome_email_sent_at timestamp with time zone,
  birth_date date,
  notify_show_reminders boolean not null default true,
  privacy_notice_20260802_sent_at timestamp with time zone
);
alter table public.profiles add constraint profiles_birth_date_age_check CHECK (((birth_date IS NULL) OR (birth_date <= (CURRENT_DATE - '14 years'::interval))));
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles enable row level security;
create policy "관리자 모든 프로필 조회" on public.profiles as permissive for select to public
  using (is_admin());
create policy "관리자 역할 변경" on public.profiles as permissive for update to public
  using (is_admin());
create policy "본인 프로필 수정" on public.profiles as permissive for update to public
  using ((auth.uid() = id));
create policy "본인 프로필 조회" on public.profiles as permissive for select to public
  using ((auth.uid() = id));
CREATE TRIGGER enforce_role_change_policy BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_unauthorized_role_change();
CREATE TRIGGER trg_prevent_profile_role_change BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_change();
-- 권한: anon=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE / authenticated=(동일) / service_role=(동일)
-- INSERT 정책 없음 — 가입 시 auth 트리거 handle_new_user(SECURITY DEFINER)가 만든다 (backup_handle_new_user_trigger_2026-07-28.sql)

-- ═════════════ shows ═════════════
create table public.shows (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text,
  venue text,
  address text,
  start_date date,
  end_date date,
  ticket_price integer default 0,
  ticket_url text,
  poster_url text,
  organizer_id uuid,
  status text not null default 'pending'::text,
  created_at timestamp with time zone default now(),
  subtitle text,
  venue_address text,
  cast_members text[] default '{}'::text[],
  directions text,
  performer_name text,
  schedule_start text,
  schedule_end text,
  genre text,
  genre_custom text,
  region text default '전체'::text,
  school_department text,
  show_time text,
  running_time text,
  age_rating text,
  map_kakao_url text,
  map_naver_url text,
  featured boolean default false,
  view_count integer default 0,
  show_category text,
  reservation_url text,
  genre_detail text,
  capacity integer,
  use_inhouse_reservation boolean not null default true,
  reservation_closed boolean not null default false
);
alter table public.shows add constraint shows_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.shows add constraint shows_pkey PRIMARY KEY (id);
CREATE INDEX idx_shows_featured ON public.shows USING btree (featured) WHERE (featured = true);
CREATE INDEX idx_shows_show_category ON public.shows USING btree (show_category);
alter table public.shows enable row level security;
create policy "공연자 공연 등록" on public.shows as permissive for insert to public
  with check ((auth.uid() = organizer_id));
create policy "공연자 본인 공연 삭제" on public.shows as permissive for delete to public
  using ((auth.uid() = organizer_id));
create policy "공연자 본인 공연 수정" on public.shows as permissive for update to public
  using ((auth.uid() = organizer_id));
create policy "공연자 본인 공연 조회" on public.shows as permissive for select to public
  using ((auth.uid() = organizer_id));
create policy "관리자 공연 삭제" on public.shows as permissive for delete to public
  using (is_admin());
create policy "관리자 공연 상태 변경" on public.shows as permissive for update to public
  using (is_admin());
create policy "관리자 모든 공연 조회" on public.shows as permissive for select to public
  using (is_admin());
create policy "승인된 공연 전체 공개" on public.shows as permissive for select to public
  using ((status = 'approved'::text));
CREATE TRIGGER syus_shows_capacity_promote AFTER UPDATE OF capacity, reservation_closed ON public.shows FOR EACH ROW WHEN (((new.capacity IS DISTINCT FROM old.capacity) OR (new.reservation_closed IS DISTINCT FROM old.reservation_closed))) EXECUTE FUNCTION syus_promote_waitlist_on_capacity_change();
-- 권한: anon=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE / authenticated=(동일) / service_role=(동일)

-- ═════════════ contacts ═════════════
create table public.contacts (
  id uuid not null default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone default now(),
  category text,
  phone text,
  deleted_at timestamp with time zone
);
alter table public.contacts add constraint contacts_pkey PRIMARY KEY (id);
CREATE INDEX idx_contacts_deleted_at ON public.contacts USING btree (deleted_at);
alter table public.contacts enable row level security;
create policy "관리자 문의 상태 변경" on public.contacts as permissive for update to public
  using (is_admin());
create policy "관리자 문의 영구 삭제" on public.contacts as permissive for delete to public
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));
create policy "관리자 문의 조회" on public.contacts as permissive for select to public
  using (is_admin());
create policy "문의 등록은 누구나" on public.contacts as permissive for insert to public
  with check (true);
-- 권한: anon=DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE / authenticated=(동일) / service_role=(동일)
