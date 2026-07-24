/**
 * 공통 메일 발송 헬퍼.
 *
 * - from은 RESEND_FROM 환경변수에서 자동 주입 (운영 도메인: no-reply@syus.co.kr)
 *   발신자 표시 이름은 "사유유사 SYUS"로 통일한다 — 인스타그램과 동일하게, 발화 주체는
 *   항상 사업자 명의(사유유사)이고 무대올림·시우스는 그 아래 서비스로만 언급된다
 *   (2026-07-24 수정. 이전에는 "무대올림"이 발신자로 표시되어 서비스가 자기 자신을
 *   발신 주체로 내세우는 모양이었다 — Instagram 운영 명의 원칙과 어긋나 통일함).
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

  const from = process.env.RESEND_FROM || "사유유사 SYUS <no-reply@syus.co.kr>";
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
