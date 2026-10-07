"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 책 후기 삭제 버튼 — 등록한 본인에게만 보인다 (2026-10-07 서버 렌더링 전환 때 page.tsx에서 떼어 냄).
 *
 * 로그인 상태는 브라우저에서 확인한다. 서버 HTML(검색 로봇이 받는 첫 화면)에는 이 버튼이 없고,
 * 브라우저가 "지금 보는 사람 = 등록자"임을 확인한 뒤에만 나타난다. 동작은 예전과 같다.
 * 실제 삭제 권한은 RLS "syus_b delete own"(본인 또는 운영자)이 최종 판단한다.
 */
export default function BookOwnerDelete({ bookId, ownerId }: { bookId: string; ownerId: string }) {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (alive) setUid(data.user?.id ?? null);
      })
      .catch(() => {
        /* 비로그인·네트워크 오류 — 버튼을 숨긴 채로 둔다 */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!uid || uid !== ownerId) return null;

  const del = async () => {
    if (busy) return;
    if (!window.confirm("이 책 후기를 삭제할까요?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("syus_books").delete().eq("id", bookId).eq("user_id", uid);
    setBusy(false);
    if (error) {
      alert("삭제하지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    router.push("/syus/corridor");
  };

  return (
    <button type="button" className="syc-comment-del" onClick={del} disabled={busy}>
      후기 삭제
    </button>
  );
}
