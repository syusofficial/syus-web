/**
 * 발송 대상 조회 — Anthropic 위탁·국외이전 개별 통지 (2026-08-02 시행).
 * 근거: output/legal/2026-07-20_anthropic_위탁_통지_최종결정.md §3 (A안 — 기존 가입 회원 전체)
 *
 * 대상 = 기존 가입 회원 전체
 *   - 탈퇴 계정 제외: 탈퇴 시 auth.users 행 삭제 → CASCADE로 profiles 행도 삭제되므로
 *     profiles 를 조회 기준으로 삼는 것만으로 자동 제외된다 (account/delete/route.ts 참고).
 *   - 이메일 미인증 계정 제외: auth.users.email_confirmed_at 기준 (profiles엔 없는 정보라
 *     admin.auth.admin.listUsers() 로 별도 확인).
 *   - 이미 이 통지를 받은 사람 제외: profiles.privacy_notice_20260802_sent_at IS NOT NULL
 *     (db/migrations/2026-07-20_privacy_notice_20260802.sql 에서 추가한 컬럼)
 *
 * dry-run과 실제 발송 양쪽에서 이 모듈을 그대로 재사용한다 — 대상자 산출 로직은 하나만 존재.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const NOTICE_COLUMN = "privacy_notice_20260802_sent_at" as const;

export type Recipient = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

/**
 * 개인정보처리방침 개정 시행일. 이 날짜를 기준으로 그룹 1(기존 회원, 미래형 문구)과
 * 그룹 2(신규 가입자, 안내형 문구)를 가른다.
 * 근거: output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §2
 *   "분기 기준은 '발송 배치'가 아니라 '가입일 vs 2026-08-02'"
 */
export const POLICY_EFFECTIVE_DATE = "2026-08-02T00:00:00+09:00" as const;

export function isGroup2(createdAt: string): boolean {
  return new Date(createdAt).getTime() >= new Date(POLICY_EFFECTIVE_DATE).getTime();
}

type ProfileRow = {
  id: string;
  name: string | null;
  created_at: string;
};

/**
 * auth.users 전체를 페이지네이션으로 순회해 (user id -> 인증된 이메일) 맵을 만든다.
 * supabase-js 는 auth 스키마를 .from()으로 직접 조회할 수 없어 admin.auth.admin.listUsers()를 쓴다.
 * (email_confirmed_at이 없는 이메일 미인증 사용자는 맵에 넣지 않는다 — 곧 발송 대상 제외로 이어짐)
 */
async function buildConfirmedEmailMap(admin: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers 실패 (page ${page}): ${error.message}`);

    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && u.email_confirmed_at) {
        map.set(u.id, u.email);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return map;
}

/**
 * 아직 통지를 받지 못한 발송 대상 전원을 반환한다.
 * (탈퇴 제외는 profiles 자체가 이미 걸러 줌 / 미인증 제외는 emailMap 조인에서 걸러짐)
 */
export async function getPendingRecipients(admin: SupabaseClient): Promise<Recipient[]> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select(`id, name, created_at, ${NOTICE_COLUMN}`)
    .is(NOTICE_COLUMN, null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`profiles 조회 실패: ${error.message}`);

  const emailMap = await buildConfirmedEmailMap(admin);

  const recipients: Recipient[] = [];
  for (const p of (profiles ?? []) as ProfileRow[]) {
    const email = emailMap.get(p.id);
    if (!email) continue; // 이메일 미인증(또는 auth.users에 없는 이상 상태) → 제외
    recipients.push({ id: p.id, email, name: p.name ?? null, createdAt: p.created_at });
  }

  return recipients;
}

/** 이미 발송을 마친 인원 수 (dry-run 보고용 — 몇 명이 이미 처리됐는지 참고 지표) */
export async function countAlreadySent(admin: SupabaseClient): Promise<number> {
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not(NOTICE_COLUMN, "is", null);

  if (error) throw new Error(`profiles 발송완료 카운트 실패: ${error.message}`);
  return count ?? 0;
}
