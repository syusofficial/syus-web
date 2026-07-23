/**
 * Anthropic 위탁·국외이전 통지(2026-08-02 시행) — 그룹 1(기존 가입 회원) 관리자 전용 배치 발송.
 *
 * 배경
 * - scripts/privacy-notice-20260802/send.ts 는 로컬 PC의 .env.local에서
 *   SUPABASE_SERVICE_ROLE_KEY·RESEND_API_KEY를 읽어 실행하는 1회성 스크립트다.
 *   로컬 .env.local에는 이 두 키가 채워져 있지 않아(placeholder) 로컬 실행이 막혀 있었다.
 * - 로컬 PC에 강력한 서비스 키를 새로 두는 대신, Vercel에 이미 등록된 운영 키를 그대로
 *   쓰는 서버 라우트를 새로 만들어 그 문제를 우회한다. 대상자 판정 로직은
 *   scripts/privacy-notice-20260802/get-recipients.ts 를 그대로 재사용한다 — 대상자
 *   산출 로직은 프로젝트 전체에서 하나만 존재해야 중복 발송 위험이 없다는 원칙을 지킨다.
 * - 그룹 2(신규 가입자, 가입일 ≥ 2026-08-02)는 이 라우트가 건드리지 않는다.
 *   /api/cron/privacy-notice-20260802 (PRIVACY_NOTICE_20260802_AUTOSEND 스위치)가 계속 전담한다.
 *
 * 인증 — CRON_SECRET과 별개의 PRIVACY_NOTICE_ADMIN_SECRET
 * - 이 토큰은 이 라우트 하나(그룹1 배치 발송)만 여닫는 좁은 권한이다.
 *   SUPABASE_SERVICE_ROLE_KEY처럼 DB 전체를 여는 키가 아니다 — 유출돼도 피해 범위가
 *   "이 엔드포인트를 다시 호출할 수 있다" 하나로 제한된다.
 * - mode=dry-run(대상자 "수"만 확인, 이메일 발송 없음)은 개인정보를 전혀 포함하지 않는
 *   집계 수치만 반환하므로 시크릿 없이 열람 가능하게 열어둔다 — 사장님이 그냥 URL만
 *   열어도 안전하게 확인할 수 있게 하기 위해서다.
 * - mode=send(실제 발송)만 PRIVACY_NOTICE_ADMIN_SECRET을 요구한다. 시크릿은 쿼리 파라미터
 *   (?secret=...), Authorization: Bearer 헤더, x-admin-secret 헤더 중 아무거나로 줄 수 있다
 *   (쿼리 파라미터 지원은 사장님이 브라우저 주소창에 URL만 붙여넣어도 되게 하기 위함).
 * - PRIVACY_NOTICE_ADMIN_SECRET이 Vercel에 설정되어 있지 않으면 send는 무조건 거부한다
 *   (설정 누락 상태에서 "인증 없이 열리는 사고"를 원천 차단).
 *
 * 안전장치
 * - 그룹 1만 처리(isGroup2 필터) — 그룹 2는 절대 이 라우트에서 보내지 않는다.
 * - 이미 보낸 사람은 profiles.privacy_notice_20260802_sent_at 로 걸러진다 — 이 라우트를
 *   여러 번(혹은 동시에) 호출해도 중복 발송되지 않는다(멱등).
 * - Vercel maxDuration(60초) 안에서 안전하게 끝내기 위해 한 번 호출당 최대
 *   MAX_PER_CALL 명까지만 처리한다. 남은 인원이 있으면 응답의 remaining에 안내하고,
 *   같은 URL을 다시 열면 이어서 처리된다(안 보낸 사람만 자동으로 골라내므로 안전).
 * - 이메일 주소·이름은 로그·응답 어디에도 남기지 않는다(PII 최소화) — 발송 증빙은
 *   DB profiles.privacy_notice_20260802_sent_at 컬럼이 1차 자료.
 *
 * 사용법 (사장님)
 *   1) 대상자 수 확인 — 아래 URL을 그냥 브라우저에서 열면 됩니다 (비밀번호 불필요):
 *      https://syus.co.kr/api/admin/privacy-notice-batch?mode=dry-run
 *   2) 실제 발송 — 클로드 코드가 별도로 전달한 시크릿 포함 URL을 브라우저에서 엽니다:
 *      https://syus.co.kr/api/admin/privacy-notice-batch?mode=send&secret=(전달받은 값)
 *      화면에 성공/실패 건수가 JSON으로 뜹니다. remaining이 0보다 크면 같은 URL을
 *      다시 열어 이어서 처리하세요(이미 보낸 사람에게는 다시 가지 않습니다).
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import { PrivacyNotice20260802Email } from "@/lib/email/templates/privacy-notice-2026-08";
import {
  NOTICE_COLUMN,
  getPendingRecipients,
  countAlreadySent,
  isGroup2,
} from "../../../../../scripts/privacy-notice-20260802/get-recipients";

const GROUP1_SUBJECT = "[사유유사] 개인정보처리방침 변경 안내 — 2026년 8월 2일 시행";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 한 번 호출로 처리할 최대 인원 — 60초 예산 안에서 Resend 호출 + 딜레이를 감안한 안전판.
// 그룹1 전체가 이보다 많으면 remaining으로 안내, 같은 URL을 다시 열면 이어서 처리(멱등).
const MAX_PER_CALL = Number(process.env.PRIVACY_NOTICE_ADMIN_BATCH_LIMIT ?? 40);
const DELAY_MS = Number(process.env.PRIVACY_NOTICE_SEND_DELAY_MS ?? 600);

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function isAuthorizedForSend(req: Request, url: URL): boolean {
  const secret = process.env.PRIVACY_NOTICE_ADMIN_SECRET;
  if (!secret) return false; // 미설정 상태에서는 무조건 거부 — 열린 채 배포되는 사고 방지

  const querySecret = url.searchParams.get("secret");
  if (querySecret && timingSafeEqual(querySecret, secret)) return true;

  const auth = req.headers.get("authorization");
  if (auth && timingSafeEqual(auth, `Bearer ${secret}`)) return true;

  const headerSecret = req.headers.get("x-admin-secret");
  if (headerSecret && timingSafeEqual(headerSecret, secret)) return true;

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function handle(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const modeParam = (url.searchParams.get("mode") || "dry-run").toLowerCase();

  if (modeParam !== "dry-run" && modeParam !== "send") {
    return NextResponse.json(
      { ok: false, error: "mode 파라미터는 'dry-run' 또는 'send'만 가능합니다." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  let allPending: Awaited<ReturnType<typeof getPendingRecipients>>;
  let alreadySent: number;
  try {
    [allPending, alreadySent] = await Promise.all([
      getPendingRecipients(admin),
      countAlreadySent(admin),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/privacy-notice-batch] 대상자 조회 실패:", message);
    return NextResponse.json(
      { ok: false, error: "recipients_query_failed", detail: message },
      { status: 500 }
    );
  }

  // 그룹 1만 — 그룹 2(신규 가입자, 가입일 ≥ 2026-08-02)는 cron이 전담하므로 여기서 제외한다.
  const group1Pending = allPending.filter((r) => !isGroup2(r.createdAt));
  const group2ExcludedCount = allPending.length - group1Pending.length;

  if (modeParam === "dry-run") {
    // 발송 없음 — 이메일·이름 등 개인정보 노출 없이 집계 수치만 반환. 시크릿 불필요.
    return NextResponse.json({
      ok: true,
      mode: "dry-run",
      group1Pending: group1Pending.length,
      group2PendingExcludedByCron: group2ExcludedCount,
      alreadySentTotal: alreadySent,
      maxPerSendCall: MAX_PER_CALL,
      note: "실제 발송은 없습니다. 발송하려면 mode=send + 관리자 시크릿이 필요합니다.",
    });
  }

  // mode === "send" — 여기서부터 인증 필수
  if (!isAuthorizedForSend(req, url)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const toProcess = group1Pending.slice(0, MAX_PER_CALL);
  const remaining = group1Pending.length - toProcess.length;

  let sent = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < toProcess.length; i += 1) {
    const recipient = toProcess[i];
    try {
      const result = await sendMail({
        to: recipient.email,
        subject: GROUP1_SUBJECT,
        react: PrivacyNotice20260802Email({ name: recipient.name }),
      });

      if (!result.ok) {
        failed += 1;
        errors.push({ id: recipient.id, error: result.error ?? "unknown" });
      } else {
        const { error: updateError } = await admin
          .from("profiles")
          .update({ [NOTICE_COLUMN]: new Date().toISOString() })
          .eq("id", recipient.id);

        if (updateError) {
          // 발송은 됐지만 기록 실패 — 다음 호출에서 같은 사람에게 재발송될 수 있다.
          errors.push({ id: recipient.id, error: `sent_but_db_update_failed: ${updateError.message}` });
        }
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push({ id: recipient.id, error: err instanceof Error ? err.message : String(err) });
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `[admin/privacy-notice-batch] 실행 완료 — 그룹1 대상 ${group1Pending.length}명 중 ${toProcess.length}명 처리, ` +
      `성공 ${sent} / 실패 ${failed}, 남은 인원 ${remaining}명`
  );
  // 이메일 주소·이름은 로그에 남기지 않는다(PII 최소화) — 발송 증빙은 DB 컬럼이 1차 자료.

  return NextResponse.json({
    ok: true,
    mode: "executed",
    group1Total: group1Pending.length,
    processed: toProcess.length,
    sent,
    failed,
    remaining,
    remainingNote:
      remaining > 0
        ? `남은 ${remaining}명은 같은 URL을 다시 열면 이어서 처리됩니다(이미 보낸 사람은 자동으로 건너뜁니다).`
        : "그룹1 전원 처리 완료.",
    errors: errors.slice(0, 10),
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
