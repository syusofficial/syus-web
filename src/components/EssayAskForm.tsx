"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SyusLoginPrompt from "@/components/SyusLoginPrompt";

/** 견해글 '질문 받기' 입력함. syus_essay_asks. 로그인 필수. */
export default function EssayAskForm() {
  const pathname = usePathname();
  const [uid, setUid] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [ask, setAsk] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) { setAsk(true); return; }
    if (body.trim().length < 1 || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("syus_essay_asks").insert({ user_id: uid, body: body.trim() });
    if (!error) { setBody(""); setDone(true); }
    setBusy(false);
  };

  if (done) {
    return <p className="syc-note" style={{ fontSize: "0.9rem", color: "#4A3B33" }}>질문이 전해졌어요. 운영자가 골라 다음 글로 답합니다. 고맙습니다.</p>;
  }

  return (
    <>
      <form onSubmit={submit} className="syc-form">
        <textarea
          className="syc-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="연기에 대해 궁금한 것을 남겨두면, 운영자가 골라 글로 답합니다."
        />
        <button
          type="submit"
          className="syc-btn"
          style={{ justifySelf: "start" }}
          disabled={uid ? busy || body.trim().length < 1 : false}
        >
          {busy ? "전하는 중…" : "질문 남기기"}
        </button>
      </form>
      <SyusLoginPrompt
        open={ask}
        onClose={() => setAsk(false)}
        next={pathname || "/syus/proscenium"}
        color="var(--color-syus-stage-proscenium)"
      />
    </>
  );
}
