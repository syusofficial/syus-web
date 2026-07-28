/**
 * Supabase Database Webhook 수신 — 회원가입 환영 메일 발송.
 *
 * 트리거 정책 (2026-07-28 사장님 결정으로 컨펌 절차 제거 — 이전 2026-06-08 "컨펌 메일 ON 유지"
 * 결정을 뒤집음. 가입 불편 민원 다수로 이메일 링크 클릭 단계를 없애기로 함)
 * - Supabase Auth "Confirm email"은 이제 OFF가 기본(대시보드 설정, 운영자 직접 액션)
 * - 컨펌이 OFF면 auth.users.email_confirmed_at이 가입 즉시(INSERT 시점)에 채워진다.
 *   컨펌이 ON으로 남아있는 예외적 경우엔 컨펌 링크 클릭 시 UPDATE로 채워진다.
 *   이 핸들러는 두 경우 모두 대응한다 (아래 3번 판정 로직 참고).
 * - 다만 이 엔드포인트는 어디까지나 보조 경로다. 신뢰의 축은
 *   src/app/auth/signup/actions.ts(triggerWelcomeEmail) — 가입 화면에서 세션이 발급되는
 *   순간 직접 호출하는 경로 — 로 옮겼다. Database Webhook의 구독 이벤트(Insert/Update)는
 *   Supabase 대시보드 설정이라 코드에서 보장할 수 없기 때문 (README.email.md 참고).
 *
 * 멱등성 (중복 발송 방지)
 * - profiles.welcome_email_sent_at 컬럼이 있으면 그 값으로 판단
 *   (없으면 best-effort: in-memory Set으로 같은 인스턴스 내 중복만 차단)
 * - DB에 컬럼 추가 SQL은 README.email.md에 기록 — 사장님이 Supabase에서 직접 실행
 * - 실제 발송 로직은 src/lib/email/welcome-trigger.ts에 공유돼 있어, 이 웹훅 경로와
 *   signup actions.ts 직접 호출 경로가 동시에 도착해도 중복 발송을 막는다.
 *
 * 보안
 * - SYUS_WEBHOOK_SECRET 헤더(x-syus-webhook-secret) 일치 시에만 처리
 * - service role 키는 서버 환경에만 존재
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmailOnce } from "@/lib/email/welcome-trigger";

// Edge가 아닌 Node 런타임 필요 (Resend SDK · React Email 렌더링)
export const runtime = "nodejs";
// 동적 처리 보장 (webhook은 캐시되지 않아야 함)
export const dynamic = "force-dynamic";

// 프로세스 내 중복 호출 방어(in-memory Set)는 src/lib/email/welcome-trigger.ts로 이동
// (웹훅 경로·signup actions.ts 직접 호출 경로가 하나의 멱등 상태를 공유하도록)

type SupabaseWebhookPayload = {
  // Database Webhook 형식 (UPDATE on auth.users)
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: {
    id: string;
    email?: string | null;
    email_confirmed_at?: string | null;
    raw_user_meta_data?: { name?: string | null } | null;
  };
  old_record?: {
    email_confirmed_at?: string | null;
  } | null;
  // Supabase Auth Hook (Send Email) 형식 — 다른 페이로드 모양 대응
  user?: {
    id?: string;
    email?: string | null;
    user_metadata?: { name?: string | null } | null;
  };
  email_data?: unknown;
};

// 어떤 HTTP 메서드든 200 반환 (Supabase webhook validation·preflight 대응)
export async function GET() {
  return NextResponse.json({ ok: true, info: "on-signup hook endpoint" });
}
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Allow": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-syus-webhook-secret",
    },
  });
}

export async function POST(req: Request) {
  // ⚠️ 비상 처치 (2026-06-26): 이 endpoint가 Auth Hook으로 잘못 등록되어 가입 차단되는
  // 사고가 있었음. 어떤 입력이든 200을 반환해서 가입 흐름을 절대 막지 않도록 변경.
  // 환영 메일은 best-effort — 처리 못 하면 조용히 스킵.

  // 1) 시크릿 검증 — 누락/불일치여도 200 반환 (가입 차단 방지)
  const secret = req.headers.get("x-syus-webhook-secret");
  const expected = process.env.SYUS_WEBHOOK_SECRET;

  if (!expected) {
    console.warn("[on-signup] SYUS_WEBHOOK_SECRET 미설정 — 메일 발송 건너뜀");
    return NextResponse.json({ ok: true, skipped: "server_misconfigured" });
  }

  if (secret !== expected) {
    console.warn("[on-signup] 시크릿 불일치 — 메일 발송 건너뜀");
    return NextResponse.json({ ok: true, skipped: "unauthorized" });
  }

  // 2) 페이로드 파싱 — 깨져도 200
  let payload: SupabaseWebhookPayload;
  try {
    payload = (await req.json()) as SupabaseWebhookPayload;
  } catch {
    console.warn("[on-signup] invalid JSON — 메일 발송 건너뜀");
    return NextResponse.json({ ok: true, skipped: "invalid_json" });
  }

  // Auth Hook 페이로드(user)와 Database Webhook 페이로드(record) 양쪽 대응
  const record = payload.record ?? (payload.user
    ? {
        id: payload.user.id ?? "",
        email: payload.user.email ?? null,
        email_confirmed_at: null,
        raw_user_meta_data: payload.user.user_metadata
          ? { name: payload.user.user_metadata.name ?? null }
          : null,
      }
    : null);
  const old_record = payload.old_record ?? null;
  const type = payload.type;

  if (!record?.id || !record.email) {
    console.log("[on-signup] skip: no_user", {
      hasRecord: Boolean(payload.record),
      hasUser: Boolean(payload.user),
    });
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
    // 진단: 여기서 멈추면 환영메일이 안 나간다. type=undefined·isConfirmedNow=false +
    // hasUser=true 면 이 endpoint가 "Auth Hook" 자리에 있다는 신호(→ Database Webhook으로 이전 필요).
    console.log("[on-signup] skip: not_new_confirmation", {
      type,
      isConfirmedNow,
      wasConfirmedBefore,
      hasRecord: Boolean(payload.record),
      hasUser: Boolean(payload.user),
    });
    return NextResponse.json({ ok: true, skipped: "not_new_confirmation" });
  }

  // 4)~7) 멱등 발송 — 공유 헬퍼(src/lib/email/welcome-trigger.ts)가
  //    in-memory Set·profiles.welcome_email_sent_at 멱등 체크와 실제 발송을 모두 처리한다.
  //    signup actions.ts의 직접 호출 경로와 동일한 멱등 상태를 공유하므로 중복 발송 걱정 없음.
  const admin = createAdminClient();
  const name = record.raw_user_meta_data?.name ?? null;

  const result = await sendWelcomeEmailOnce(admin, { id: record.id, email: record.email, name });

  if (!result.sent) {
    return NextResponse.json({ ok: true, skipped: result.reason });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
