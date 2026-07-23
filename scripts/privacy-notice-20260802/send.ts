/**
 * Anthropic 위탁·국외이전 개별 통지 — 발송 스크립트 (2026-08-02 시행 개인정보처리방침 개정)
 * 근거: output/legal/2026-07-20_anthropic_위탁_통지_최종결정.md (법무팀 최종 결정)
 *
 * 실행 방법 (repo 루트, syus-web/ 에서)
 *   dry-run(발송 없이 대상자 수만 확인) — 기본값, 몇 번을 실행해도 안전:
 *     npm run privacy-notice:dry-run
 *
 *   실제 발송 — 반드시 --confirm 문구까지 정확히 일치해야 동작:
 *     npm run privacy-notice:send
 *
 *   일부만 먼저 보내보고 싶을 때 (예: 처음 5명만 테스트):
 *     npx tsx scripts/privacy-notice-20260802/send.ts --send --confirm=SEND_PRIVACY_NOTICE_20260802 --limit=5
 *
 * 안전장치
 * - 기본은 dry-run. "--send" 플래그 + 정확한 "--confirm=SEND_PRIVACY_NOTICE_20260802" 문구가
 *   함께 있어야만 실제 이메일이 나간다. 둘 중 하나라도 없으면 무조건 중단.
 * - 이미 보낸 사람은 profiles.privacy_notice_20260802_sent_at 로 걸러진다 — 실행을 여러 번 해도
 *   중복 발송되지 않는다. (DB 마이그레이션 필요: db/migrations/2026-07-20_privacy_notice_20260802.sql
 *   을 Supabase SQL Editor에서 먼저 실행해 두어야 함)
 * - 발송이 일부 실패해도 스크립트는 멈추지 않고 나머지를 계속 처리한다. 실패한 사람은
 *   sent_at이 비어 있으므로, 스크립트를 다시 실행하면 실패 건만 자연스럽게 재시도된다.
 * - Resend 요청 사이 기본 600ms 대기 (PRIVACY_NOTICE_SEND_DELAY_MS 환경변수로 조절 가능) —
 *   대량 발송 시 Resend rate limit 방지.
 * - 실행마다 scripts/privacy-notice-20260802/logs/ 에 요약 로그(JSON)를 남긴다. 이메일 주소는
 *   로그 파일에 남기지 않는다(PII 최소화) — "누구에게 보냈다"는 증빙은 DB 컬럼이 1차 자료.
 *
 * 이 스크립트는 1회성이다. 통지가 끝나면 삭제하지 않고 기록으로 남겨 두되(다음 유사 통지 때
 * 참고용), 다시 실행해도 대상자가 0명이면 아무 일도 하지 않는다(멱등).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const ENV_LOCAL_PATH = resolve(REPO_ROOT, ".env.local");

const CONFIRM_PHRASE = "SEND_PRIVACY_NOTICE_20260802";
const SUBJECT = "[사유유사] 개인정보처리방침 변경 안내 — 2026년 8월 2일 시행";
const DEFAULT_DELAY_MS = 600;

// ── .env.local 로드 (repo에 dotenv 의존성이 없어 최소 파서를 직접 둔다) ──
// 반드시 email 모듈을 import 하기 전에 실행해야 한다. src/lib/email/client.ts가
// 모듈 로드 시점에 `new Resend(process.env.RESEND_API_KEY)`를 실행하는데, 이걸
// 정적 import로 먼저 평가시키면 키가 비어 있는 채로 클라이언트가 굳어버려서
// 이후 모든 발송이 "RESEND_API_KEY_MISSING"으로 조용히 실패한다.
function loadEnvLocal(): void {
  if (!existsSync(ENV_LOCAL_PATH)) {
    console.warn(`[env] ${ENV_LOCAL_PATH} 가 없습니다 — 이미 설정된 환경변수만 사용합니다.`);
    return;
  }
  const raw = readFileSync(ENV_LOCAL_PATH, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

type Args = {
  send: boolean;
  confirm: string | null;
  limit: number | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { send: false, confirm: null, limit: null };
  for (const a of argv) {
    if (a === "--send") args.send = true;
    else if (a.startsWith("--confirm=")) args.confirm = a.slice("--confirm=".length);
    else if (a.startsWith("--limit=")) {
      const n = Number(a.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    }
  }
  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type RunSummary = {
  mode: "dry-run" | "send";
  total: number;
  alreadySent: number;
  limit: number | null;
  sent: number;
  failed: number;
  errors: { id: string; error: string }[];
};

function writeRunLog(summary: RunSummary): void {
  const logsDir = resolve(__dirname, "logs");
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = resolve(logsDir, `run-${timestamp}.json`);

  writeFileSync(logPath, JSON.stringify({ startedAt: timestamp, ...summary }, null, 2), "utf-8");
  console.log(`\n실행 로그 저장: ${logPath}`);
  console.log("(이메일 주소·이름은 로그 파일에 남기지 않음 — 발송 증빙은 DB profiles.privacy_notice_20260802_sent_at)");
}

async function main() {
  loadEnvLocal();

  const args = parseArgs(process.argv.slice(2));
  const isLiveSend = args.send;

  if (isLiveSend && args.confirm !== CONFIRM_PHRASE) {
    console.error(
      `[중단] 실제 발송에는 --confirm=${CONFIRM_PHRASE} 을 정확히 함께 넘겨야 합니다.\n` +
        `그냥 "npm run privacy-notice:send" 를 쓰면 자동으로 붙습니다.`
    );
    process.exit(1);
  }

  // env 로드 이후 동적 import — 위 주석 참고
  const [{ createAdminClient }, { sendMail }, templateModule, recipientsModule] = await Promise.all([
    import("../../src/lib/supabase/admin"),
    import("../../src/lib/email/send"),
    import("../../src/lib/email/templates/privacy-notice-2026-08"),
    import("./get-recipients"),
  ]);
  const { PrivacyNotice20260802Email } = templateModule;
  const { getPendingRecipients, countAlreadySent, isGroup2 } = recipientsModule;

  const admin = createAdminClient();

  console.log(
    isLiveSend
      ? "=== 실제 발송 모드 ==="
      : "=== dry-run 모드 (이메일 발송 없음, 대상자 수만 확인) ==="
  );

  const [pending, alreadySent] = await Promise.all([getPendingRecipients(admin), countAlreadySent(admin)]);

  const total = pending.length;
  const toProcess = args.limit ? pending.slice(0, args.limit) : pending;

  console.log(`발송 대상(미발송, 인증완료, 탈퇴제외): ${total}명`);
  console.log(`이미 발송 완료: ${alreadySent}명`);
  if (args.limit) {
    console.log(`--limit=${args.limit} 지정 — 이번 실행은 ${toProcess.length}명까지만 처리합니다.`);
  }

  if (!isLiveSend) {
    const sampleNames = toProcess.slice(0, 3).map((r) => r.name ?? "(이름 미입력)");
    console.log(`\n[dry-run] 실제 이메일은 한 통도 발송되지 않았습니다.`);
    if (sampleNames.length > 0) {
      console.log(`샘플(이름만, 이메일 비표시): ${sampleNames.join(", ")}${total > 3 ? " 외" : ""}`);
    }
    writeRunLog({ mode: "dry-run", total, alreadySent, limit: args.limit, sent: 0, failed: 0, errors: [] });
    console.log(`\n실제 발송하려면: npm run privacy-notice:send`);
    return;
  }

  const delayMs = Number(process.env.PRIVACY_NOTICE_SEND_DELAY_MS ?? DEFAULT_DELAY_MS);
  let sent = 0;
  let failed = 0;
  const errors: { id: string; error: string }[] = [];

  for (let i = 0; i < toProcess.length; i += 1) {
    const recipient = toProcess[i];
    process.stdout.write(`  [${i + 1}/${toProcess.length}] 발송 중... `);

    // 이 스크립트는 그룹 1(가입일 < 2026-08-02) 전용이다. 그룹 2 해당자는
    // api/cron/privacy-notice-20260802 가 별도 문구로 처리하므로 여기서는 건너뛴다
    // (근거: 2026-07-20_anthropic_통지_신규가입자_포함_결정.md §2 — 문구가 사실과
    // 어긋나는 것을 막기 위한 안전장치. 오늘(배치 실행일) 기준으로는 발생할 수 없는
    // 케이스지만, 스크립트를 늦게 재실행하는 경우를 대비한다).
    if (isGroup2(recipient.createdAt)) {
      console.log("건너뜀 (가입일이 2026-08-02 이후 — 그룹 2, cron이 별도 처리)");
      continue;
    }

    try {
      const result = await sendMail({
        to: recipient.email,
        subject: SUBJECT,
        react: PrivacyNotice20260802Email({ name: recipient.name }),
      });

      if (!result.ok) {
        failed += 1;
        errors.push({ id: recipient.id, error: result.error ?? "unknown" });
        console.log(`실패 (${result.error})`);
      } else {
        const { error: updateError } = await admin
          .from("profiles")
          .update({ privacy_notice_20260802_sent_at: new Date().toISOString() })
          .eq("id", recipient.id);

        if (updateError) {
          console.log(
            `발송은 됐지만 DB 기록 실패(${updateError.message}) — 다음 실행에서 같은 사람에게 재발송될 수 있으니 즉시 확인 필요`
          );
          errors.push({ id: recipient.id, error: `sent_but_db_update_failed: ${updateError.message}` });
        } else {
          console.log("성공");
        }
        sent += 1;
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ id: recipient.id, error: message });
      console.log(`예외 (${message})`);
    }

    if (i < toProcess.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(`\n완료 — 성공 ${sent} / 실패 ${failed} / 이번 실행 대상 ${toProcess.length}명`);
  if (failed > 0) {
    console.log("실패 건은 sent_at이 비어 있으므로 스크립트를 다시 실행하면 실패 건만 자동 재시도됩니다.");
  }

  writeRunLog({ mode: "send", total, alreadySent, limit: args.limit, sent, failed, errors });
}

main().catch((err) => {
  console.error("[치명적 오류]", err);
  process.exit(1);
});
