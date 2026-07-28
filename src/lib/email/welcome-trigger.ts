/**
 * 회원가입 환영 메일 — 발송 로직 (idempotent, best-effort).
 *
 * 2026-07-28 신설 배경
 * - 사장님 결정으로 회원가입 시 "이메일 컨펌 클릭" 절차를 제거함
 *   (Supabase 대시보드 Confirm email OFF — 운영자 직접 액션).
 * - 컨펌이 꺼지면 auth.users.email_confirmed_at이 가입 즉시(INSERT 시점) 채워진다.
 *   기존에는 컨펌 클릭 때 발생하는 UPDATE 이벤트만으로 Database Webhook을 걸어도
 *   충분했지만, 이제는 그 UPDATE 자체가 발생하지 않을 수 있다.
 * - Database Webhook의 실제 구독 이벤트(Insert/Update 둘 다인지)는 Supabase
 *   대시보드 설정이라 코드에서 확인·강제할 수 없으므로, 대시보드 설정에만
 *   기대지 않도록 회원가입 화면에서도 이 함수를 직접 호출한다
 *   (src/app/auth/signup/actions.ts → triggerWelcomeEmail).
 * - 웹훅 경로(on-signup/route.ts)와 직접 호출 경로가 동시에 도착해도
 *   profiles.welcome_email_sent_at 멱등 체크로 중복 발송을 막는다.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/email/send";
import { WelcomeEmail } from "@/lib/email/templates/welcome";

// 프로세스 내 중복 호출 방어 (웹훅 경로와 이 모듈을 공유하므로 여기서 한 번만 유지)
const inMemorySent = new Set<string>();

type WelcomeTarget = {
  id: string;
  email: string;
  name?: string | null;
};

export type WelcomeSendResult =
  | { sent: true; id?: string }
  | { sent: false; reason: string };

/**
 * 환영 메일을 최대 1회만 보낸다. 이미 보냈으면 조용히 스킵.
 * 실패해도 절대 throw하지 않는다 — 호출부(가입 흐름·웹훅)를 막지 않기 위함.
 */
export async function sendWelcomeEmailOnce(
  admin: SupabaseClient,
  target: WelcomeTarget
): Promise<WelcomeSendResult> {
  const { id, email } = target;
  let name = target.name ?? null;

  if (!id || !email) {
    return { sent: false, reason: "missing_id_or_email" };
  }

  if (inMemorySent.has(id)) {
    return { sent: false, reason: "already_sent_in_memory" };
  }

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("name, welcome_email_sent_at")
      .eq("id", id)
      .maybeSingle();

    if (profile?.welcome_email_sent_at) {
      inMemorySent.add(id);
      return { sent: false, reason: "already_sent_in_db" };
    }
    if (profile?.name) name = profile.name;
  } catch (err) {
    // 컬럼 미생성 등 — 조회 실패해도 발송은 계속 진행 (기존 웹훅 로직과 동일한 완화 전략)
    console.warn("[welcome-trigger] profiles 조회 경고:", err);
  }

  let result: { ok: boolean; id?: string; error?: unknown };
  try {
    result = await sendMail({
      to: email,
      subject: "사유유사 무대올림에 오신 것을 환영합니다",
      react: WelcomeEmail({ name }),
    });
  } catch (err) {
    console.error("[welcome-trigger] sendMail 예외:", err);
    return { sent: false, reason: "send_exception" };
  }

  if (!result.ok) {
    console.error("[welcome-trigger] 발송 실패:", result.error);
    return { sent: false, reason: "send_failed" };
  }

  inMemorySent.add(id);
  try {
    await admin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", id);
  } catch (err) {
    console.warn("[welcome-trigger] welcome_email_sent_at 기록 경고:", err);
  }

  console.log("[welcome-trigger] 환영메일 발송 성공", { id: result.id });
  return { sent: true, id: result.id };
}
