"use server";

/**
 * 회원가입 직후 — 환영 메일 직접 트리거 (2026-07-28 신설).
 *
 * 배경: 이메일 컨펌 절차 제거로 Supabase Database Webhook(UPDATE on auth.users)만으로는
 * 환영 메일이 안 나갈 수 있다 (자세한 배경은 welcome-trigger.ts 상단 주석 참조).
 * 그래서 가입 화면에서 세션이 발급된 순간(=가입 즉시 이용 가능한 상태) 이 액션을 직접
 * 호출해 웹훅 도착 여부와 무관하게 환영 메일을 보낸다. service role 키는 서버에서만
 * 쓰이며 클라이언트 번들에 노출되지 않는다.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmailOnce } from "@/lib/email/welcome-trigger";

export async function triggerWelcomeEmail(userId: string): Promise<void> {
  if (!userId) return;

  try {
    const admin = createAdminClient();
    const { data: userRes } = await admin.auth.admin.getUserById(userId);
    const user = userRes?.user;
    if (!user?.email) return;

    await sendWelcomeEmailOnce(admin, {
      id: user.id,
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    });
  } catch (err) {
    // best-effort — 가입 흐름은 절대 이 실패로 막히지 않는다
    console.warn("[signup/actions] triggerWelcomeEmail 실패:", err);
  }
}
