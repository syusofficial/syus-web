/**
 * Supabase Database Webhook 수신 — 회원가입 환영 메일 발송.
 *
 * 트리거 정책 (사장님 결정 2026-06-08)
 * - Supabase Auth 컨펌 메일은 ON 유지
 * - 사용자가 컨펌 링크 클릭 → auth.users.email_confirmed_at이 채워짐
 * - 그 시점에 Supabase Database Webhook(UPDATE on auth.users)이 이 엔드포인트로 POST
 * - 이 핸들러는 컨펌이 처음 완료된 경우에만 환영 메일을 1회 발송
 *
 * 멱등성 (중복 발송 방지)
 * - profiles.welcome_email_sent_at 컬럼이 있으면 그 값으로 판단
 *   (없으면 best-effort: in-memory Set으로 같은 인스턴스 내 중복만 차단)
 * - DB에 컬럼 추가 SQL은 README.email.md에 기록 — 사장님이 Supabase에서 직접 실행
 *
 * 보안
 * - SYUS_WEBHOOK_SECRET 헤더(x-syus-webhook-secret) 일치 시에만 처리
 * - service role 키는 서버 환경에만 존재
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { WelcomeEmail } from "@/lib/email/templates/welcome";

// Edge가 아닌 Node 런타임 필요 (Resend SDK · React Email 렌더링)
export const runtime = "nodejs";
// 동적 처리 보장 (webhook은 캐시되지 않아야 함)
export const dynamic = "force-dynamic";

// fallback 멱등성 — 프로세스 내 중복 호출 방어
// (Vercel 인스턴스가 새로 뜨면 리셋되지만, profiles.welcome_email_sent_at이 1차 방어선)
const inMemorySent = new Set<string>();

type SupabaseWebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    raw_user_meta_data?: { name?: string | null } | null;
  };
  old_record?: {
    email_confirmed_at?: string | null;
  } | null;
};

export async function POST(req: Request) {
  // 1) 시크릿 검증
  const secret = req.headers.get("x-syus-webhook-secret");
  const expected = process.env.SYUS_WEBHOOK_SECRET;

  if (!expected) {
    console.error("[on-signup] SYUS_WEBHOOK_SECRET이 설정되지 않았습니다.");
    return NextResponse.json({ ok: false, error: "server_misconfigured" }, { status: 500 });
  }

  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 2) 페이로드 파싱
  let payload: SupabaseWebhookPayload;
  try {
    payload = (await req.json()) as SupabaseWebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { record, old_record, type } = payload;
  if (!record?.id || !record.email) {
    return NextResponse.json({ ok: true, skipped: "no_user" });
  }

  // 3) 컨펌 "신규 완료" 시점만 발송
  //    - INSERT인데 이미 confirmed (관리자가 컨펌된 상태로 생성한 경우) → 발송 허용
  //    - UPDATE이고 old에는 null이었는데 new에 timestamp가 들어온 경우 → 발송
  //    - 그 외(아직 미컨펌, 또는 이미 컨펌됐던 사용자 정보 수정) → 스킵
  const wasConfirmedBefore = Boolean(old_record?.email_confirmed_at);
  const isConfirmedNow = Boolean(record.email_confirmed_at);
  const isNewConfirmation =
    isConfirmedNow && (type === "INSERT" || (type === "UPDATE" && !wasConfirmedBefore));

  if (!isNewConfirmation) {
    return NextResponse.json({ ok: true, skipped: "not_new_confirmation" });
  }

  // 4) 멱등성 — 프로세스 내 중복 차단
  if (inMemorySent.has(record.id)) {
    return NextResponse.json({ ok: true, skipped: "already_sent_in_memory" });
  }

  // 5) 멱등성 — DB 기반 (profiles.welcome_email_sent_at)
  //    컬럼이 없을 수도 있으므로 에러는 무시하고 계속 진행
  const admin = createAdminClient();
  let name: string | null = record.raw_user_meta_data?.name ?? null;

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("name, welcome_email_sent_at")
      .eq("id", record.id)
      .maybeSingle();

    if (profile?.welcome_email_sent_at) {
      inMemorySent.add(record.id);
      return NextResponse.json({ ok: true, skipped: "already_sent_in_db" });
    }
    if (profile?.name) name = profile.name;
  } catch (err) {
    // 컬럼 미생성 등의 사유로 실패 가능 — 발송은 계속 진행하되 로그만 남김
    console.warn("[on-signup] profiles 조회 경고:", err);
  }

  // 6) 메일 발송
  const result = await sendMail({
    to: record.email,
    subject: "사유유사 무대올림에 오신 것을 환영합니다",
    react: WelcomeEmail({ name }),
  });

  if (!result.ok) {
    // 발송 실패는 200으로 응답하지 않음 → Supabase가 재시도하도록 5xx 반환
    console.error("[on-signup] 발송 실패:", result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  // 7) 멱등성 기록
  inMemorySent.add(record.id);
  try {
    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", record.id);
  } catch (err) {
    // 컬럼 없으면 무시 — in-memory Set이 같은 인스턴스 내 중복은 막아 줌
    console.warn("[on-signup] welcome_email_sent_at 기록 경고:", err);
  }

  return NextResponse.json({ ok: true, id: result.id });
}
