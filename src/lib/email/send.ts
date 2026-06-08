/**
 * 공통 메일 발송 헬퍼.
 *
 * - from은 RESEND_FROM 환경변수에서 자동 주입 (운영 도메인: no-reply@syus.co.kr)
 * - replyTo는 RESEND_REPLY_TO에서 자동 주입 (운영자 Gmail: syusflux@gmail.com)
 *   → 사용자가 그대로 답장하면 운영자 메일함으로 직행
 * - 키 미설정·발송 실패는 silent fail (회원가입·승인 흐름이 메일 오류로 중단되지 않도록)
 *   대신 콘솔에 명확한 경고를 남겨 모니터링에서 확인할 수 있게 한다.
 */
import type { ReactElement } from "react";
import { resend } from "@/lib/email/client";

type SendMailInput = {
  to: string;
  subject: string;
  react: ReactElement;
};

export async function sendMail({ to, subject, react }: SendMailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[sendMail] RESEND_API_KEY가 비어 있어 발송을 건너뜁니다.", { to, subject });
    return { ok: false, error: "RESEND_API_KEY_MISSING" };
  }

  const from = process.env.RESEND_FROM || "무대올림 <no-reply@syus.co.kr>";
  const replyTo = process.env.RESEND_REPLY_TO || "syusflux@gmail.com";

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      replyTo,
      react,
    });

    if (error) {
      console.error("[sendMail] Resend 발송 실패:", error, { to, subject });
      return { ok: false, error: error.message ?? String(error) };
    }

    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[sendMail] 예외 발생:", err, { to, subject });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
