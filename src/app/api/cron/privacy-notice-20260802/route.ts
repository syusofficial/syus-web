/**
 * 개인정보처리방침 개정(2026-08-02 시행, Anthropic PBC 위탁·국외이전 추가) 통지 —
 * "이후 새로 가입하는 회원"을 위한 자동 재확인 cron.
 *
 * 배경
 * - 기존 가입 회원 전체 대상 통지는 1회성 수동 배치(scripts/privacy-notice-20260802/send.ts)로
 *   따로 처리한다. 이 라우트는 그 배치를 대체하지 않는다 — 손대지 않는다.
 * - 신규 가입자는 계속 늘어나므로 "가입할 때마다 자동으로 포함"되어야 하는데, 매번 사람이
 *   send.ts를 다시 실행하는 대신 매일 한 번 이 cron이 대상자 쿼리를 다시 돌려 "아직 통지
 *   못 받은 사람(= 신규 가입자 포함)"에게만 보낸다.
 * - 대상자 판정 로직(getPendingRecipients — sent_at IS NULL + 인증완료 + 탈퇴제외)은
 *   scripts/privacy-notice-20260802/get-recipients.ts 를 그대로 재사용한다. 새 쿼리를
 *   만들지 않는다 — 대상자 산출 로직은 프로젝트 전체에서 하나만 존재해야 중복 발송 위험이 없다.
 *
 * 신규 가입 훅(src/app/api/hooks/on-signup)에 얹지 않고 별도 cron으로 분리한 이유
 * - on-signup은 2026-06-26 가입 차단 사고 이후 "무슨 일이 있어도 200을 반환"하도록
 *   경직되게 하드닝된 핵심 가입 경로다. 여기에 개인정보처리방침 통지 같은 부가 로직을
 *   더 얹으면, 이 통지 발송이 실패했을 때 회원가입 자체에 영향을 줄 위험을 새로 만든다.
 * - 법적 통지는 "가입 즉시"일 필요가 없다 — 하루 단위 재확인으로 충분하고, 실패해도
 *   sent_at이 비어 있는 한 다음 날 자동으로 재시도된다(멱등·자기치유).
 * - show-reminders cron과 동일한 패턴(CRON_SECRET 인증, Vercel Cron 트리거)을 그대로 따른다.
 *
 * 활성화 스위치 — 기본은 꺼짐(아무 것도 보내지 않음)
 * - PRIVACY_NOTICE_20260802_AUTOSEND 환경변수가 정확히 "true"일 때만 실제로 발송한다.
 *   그 외(미설정 포함)에는 대상자 수만 로그로 남기고 종료한다(=dry-run과 동일한 안전 상태).
 * - db/migrations/2026-07-20_privacy_notice_20260802.sql 실행 + vercel.json cron 등록 +
 *   Vercel 환경변수 PRIVACY_NOTICE_20260802_AUTOSEND=true 세 가지가 모두 갖춰져야 실제 발송된다.
 *   (사장님 최종 승인 없이는 이 중 마지막 스위치가 켜지지 않는다.)
 *
 * 신규 가입자용 문구 + 가입일 분기 (2026-07-22 법무팀 확정 반영)
 * - 법무팀 결정(output/legal/2026-07-20_anthropic_통지_신규가입자_포함_결정.md §2)에 따라
 *   "그룹 1(미래형 문구)이냐 그룹 2(안내형 문구)냐"는 발송 배치가 아니라 가입일과
 *   정책 시행일(2026-08-02)의 선후로 정해진다. 이 cron이 매일 재확인하는 "아직 통지
 *   못 받은 사람" 안에는 이론상 그룹 1 낙오자(배치 발송 실패 등)와 그룹 2 신규
 *   가입자가 섞여 있을 수 있으므로, 대상자 각자의 가입일을 보고 매번 알맞은 템플릿을
 *   고른다 — 전원에게 그룹 2 문구를 일괄 적용하지 않는다.
 * - 제목·템플릿 자체는 src/lib/notices/privacy-notice-20260802-config.ts(그룹 2)와
 *   lib/email/templates/privacy-notice-2026-08(그룹 1)를 통해서만 참조한다.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email/send";
import {
  NEW_SIGNUP_NOTICE_SUBJECT,
  NewSignupPrivacyNoticeEmail,
} from "@/lib/notices/privacy-notice-20260802-config";
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

// 한 번 실행에서 처리할 최대 인원 — 신규 가입자는 하루 몇 명 수준일 것으로 예상되지만,
// 혹시 밀려 있어도 maxDuration·Resend rate limit을 넘지 않도록 안전판을 둔다.
// 못 보낸 나머지는 sent_at이 비어 있으므로 다음 날 실행에서 이어서 처리된다.
const DEFAULT_BATCH_LIMIT = 50;
const DEFAULT_DELAY_MS = 600;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret === secret) return true;

  return false;
}

function isAutosendEnabled(): boolean {
  return process.env.PRIVACY_NOTICE_20260802_AUTOSEND === "true";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 대상자 조회는 활성화 여부와 무관하게 항상 수행 — 꺼져 있을 때도 "몇 명 밀려 있는지"는
  // Vercel Logs에서 확인할 수 있게 한다(= dry-run과 동일한 관찰 가능성).
  let pending: Awaited<ReturnType<typeof getPendingRecipients>>;
  let alreadySent: number;
  try {
    [pending, alreadySent] = await Promise.all([getPendingRecipients(admin), countAlreadySent(admin)]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/privacy-notice-20260802] 대상자 조회 실패 — 마이그레이션 미실행 가능성:", message);
    return NextResponse.json(
      { ok: false, error: "recipients_query_failed", detail: message },
      { status: 500 }
    );
  }

  if (!isAutosendEnabled()) {
    console.log(
      `[cron/privacy-notice-20260802] 비활성 상태(PRIVACY_NOTICE_20260802_AUTOSEND != "true") — ` +
        `대기 중 ${pending.length}명, 발송 완료 ${alreadySent}명. 아무 것도 보내지 않음.`
    );
    return NextResponse.json({
      ok: true,
      mode: "disabled",
      pending: pending.length,
      alreadySent,
    });
  }

  const batchLimit = Number(process.env.PRIVACY_NOTICE_20260802_BATCH_LIMIT ?? DEFAULT_BATCH_LIMIT);
  const delayMs = Number(process.env.PRIVACY_NOTICE_SEND_DELAY_MS ?? DEFAULT_DELAY_MS);
  const toProcess = pending.slice(0, Number.isFinite(batchLimit) && batchLimit > 0 ? batchLimit : DEFAULT_BATCH_LIMIT);

  let sent = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  let group1Count = 0;
  let group2Count = 0;

  for (let i = 0; i < toProcess.length; i += 1) {
    const recipient = toProcess[i];
    const recipientIsGroup2 = isGroup2(recipient.createdAt);
    if (recipientIsGroup2) group2Count += 1;
    else group1Count += 1;

    try {
      const result = await sendMail({
        to: recipient.email,
        subject: recipientIsGroup2 ? NEW_SIGNUP_NOTICE_SUBJECT : GROUP1_SUBJECT,
        react: recipientIsGroup2
          ? NewSignupPrivacyNoticeEmail({ name: recipient.name })
          : PrivacyNotice20260802Email({ name: recipient.name }),
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
          // 발송은 됐지만 기록 실패 — 다음 실행에서 같은 사람에게 재발송될 수 있다.
          errors.push({ id: recipient.id, error: `sent_but_db_update_failed: ${updateError.message}` });
        }
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      errors.push({ id: recipient.id, error: err instanceof Error ? err.message : String(err) });
    }

    if (i < toProcess.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(
    `[cron/privacy-notice-20260802] 실행 완료 — 대상 ${pending.length}명 중 ${toProcess.length}명 처리 ` +
      `(그룹1 ${group1Count} / 그룹2 ${group2Count}), 성공 ${sent} / 실패 ${failed}`
  );
  // 이메일 주소·이름은 로그에 남기지 않는다(PII 최소화) — 발송 증빙은
  // profiles.privacy_notice_20260802_sent_at 컬럼이 1차 자료.

  return NextResponse.json({
    ok: true,
    mode: "executed",
    totalPending: pending.length,
    group1: group1Count,
    group2: group2Count,
    alreadySent,
    processed: toProcess.length,
    sent,
    failed,
    errors: errors.slice(0, 10),
  });
}
