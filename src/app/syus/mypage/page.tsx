"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 독립 마이페이지 (/syus/mypage).
 * 내가 쓴 글 + 좋아요(찜)한 글을 모아 본다. 1차: 연기 고민 QnA 연결(다른 섹션은 오픈되며 추가).
 * 테이블 미생성/빈 경우 그레이스풀 빈 상태. 두 마이페이지(무대올림·시우스) 상호 다리.
 */

type Tab = "posts" | "likes";
type QItem = { id: string; title: string; created_at: string };

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function SyusMyPage() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");
  const [myPosts, setMyPosts] = useState<QItem[]>([]);
  const [liked, setLiked] = useState<QItem[]>([]);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async (uid: string) => {
    const supabase = createClient();
    try {
      const { data: mine } = await supabase
        .from("syus_questions")
        .select("id, title, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      setMyPosts((mine as QItem[] | null) ?? []);
    } catch { setMyPosts([]); }

    try {
      const { data: likes } = await supabase
        .from("syus_likes")
        .select("target_id")
        .eq("user_id", uid)
        .eq("target_type", "question")
        .order("created_at", { ascending: false });
      const ids = (likes ?? []).map((l: { target_id: string }) => l.target_id);
      if (ids.length) {
        const { data: qs } = await supabase
          .from("syus_questions")
          .select("id, title, created_at")
          .in("id", ids);
        setLiked((qs as QItem[] | null) ?? []);
      } else {
        setLiked([]);
      }
    } catch { setLiked([]); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setEmail(data.user?.email ?? null);
      if (uid) await loadData(uid);
      setReady(true);
    });
    return () => { mounted = false; };
  }, [loadData]);

  const deletePost = async (id: string) => {
    if (!userId || busy) return;
    if (!window.confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.from("syus_questions").delete().eq("id", id).eq("user_id", userId);
    await loadData(userId);
    setBusy(false);
  };

  if (!ready) {
    return <main className="symy-wrap"><p className="symy-loading">불러오는 중…</p><Style /></main>;
  }

  if (!email && !userId) {
    return (
      <main className="symy-wrap symy-center">
        <h1 className="symy-title">시우스 마이페이지</h1>
        <p className="symy-sub">로그인하면 내가 쓴 글과 찜해둔 글을 이곳에서 모아볼 수 있어요.</p>
        <Link href="/auth/login?next=/syus/mypage" className="symy-login">로그인하기 →</Link>
        <Style />
      </main>
    );
  }

  const list = tab === "posts" ? myPosts : liked;

  return (
    <main className="symy-wrap">
      <header className="symy-head">
        <p className="symy-eyebrow">My · 시우스 SYUS</p>
        <h1 className="symy-title">내 시우스</h1>
        <p className="symy-sub">{email ?? "로그인됨"}</p>
      </header>

      <div className="symy-tabs">
        <button type="button" className={`symy-tab ${tab === "posts" ? "is-on" : ""}`} onClick={() => setTab("posts")}>
          내가 쓴 글{myPosts.length ? ` (${myPosts.length})` : ""}
        </button>
        <button type="button" className={`symy-tab ${tab === "likes" ? "is-on" : ""}`} onClick={() => setTab("likes")}>
          찜한 글{liked.length ? ` (${liked.length})` : ""}
        </button>
      </div>

      <section className="symy-panel">
        {list.length === 0 ? (
          <div className="symy-empty">
            <p className="symy-empty-h">{tab === "posts" ? "아직 남긴 글이 없어요." : "아직 찜한 글이 없어요."}</p>
            <p className="symy-empty-b">
              {tab === "posts"
                ? "여섯 무대 중 한 곳에서 첫 글을 남기면, 여기에서 모아 보고 관리할 수 있어요."
                : "마음에 드는 글에 찜(♥)을 누르면, 여기에 모여 언제든 다시 꺼내볼 수 있어요."}
            </p>
            <Link href="/syus" className="symy-empty-link">여섯 무대 둘러보기 →</Link>
          </div>
        ) : (
          <ul className="symy-list">
            {list.map((q) => (
              <li key={q.id} className="symy-item">
                <Link href={`/syus/qna/${q.id}`} className="symy-item-link">
                  <span className="symy-item-title">{q.title}</span>
                  <span className="symy-item-meta">{fmt(q.created_at)} · 연기 고민 QnA</span>
                </Link>
                {tab === "posts" && (
                  <button type="button" className="symy-del" onClick={() => deletePost(q.id)} disabled={busy}>삭제</button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="symy-note">※ 지금은 연기 고민 QnA가 연결되어 있어요. 다른 섹션도 열리는 대로 이 목록에 함께 모입니다.</p>
      </section>

      <nav className="symy-bridge">
        <Link href="/mypage" className="symy-bridge-link">무대올림 마이페이지 →</Link>
        <Link href="/syus" className="symy-bridge-link symy-bridge-muted">여섯 무대로</Link>
        <Link href="/muol" className="symy-bridge-link symy-bridge-muted">무대올림으로</Link>
      </nav>

      <Style />
    </main>
  );
}

function Style() {
  return (
    <style>{`
      .symy-wrap { max-width: 44rem; margin: 0 auto; padding: clamp(48px, 9vh, 104px) clamp(24px, 6vw, 48px) 120px; }
      .symy-loading { font-family: var(--font-noto-sans-kr); color: #6B5C50; }
      .symy-center { text-align: center; }
      .symy-eyebrow { font-family: var(--font-inter); font-size: 0.72rem; letter-spacing: 0.32em; text-transform: uppercase; font-weight: 600; color: #0B5563; margin-bottom: 16px; }
      .symy-head { margin-bottom: 32px; }
      .symy-title { font-family: var(--font-noto-serif-kr); font-size: clamp(1.9rem, 4.6vw, 2.8rem); font-weight: 700; letter-spacing: -0.02em; color: #241C18; margin-bottom: 10px; }
      .symy-sub { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; color: #6B5C50; }
      .symy-login { display: inline-block; margin-top: 24px; font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 600; color: #F4F2ED; background: #0B5563; text-decoration: none; padding: 13px 30px; }
      .symy-login:hover { opacity: 0.92; }

      .symy-tabs { display: flex; gap: 6px; border-bottom: 1px solid #E0DBD0; margin-bottom: 28px; }
      .symy-tab { appearance: none; background: none; border: 0; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.95rem; font-weight: 600; color: #A79E90; padding: 12px 6px; margin-bottom: -1px; border-bottom: 2px solid transparent; }
      .symy-tab.is-on { color: #241C18; border-bottom-color: #0B5563; }

      .symy-panel { min-height: 200px; }
      .symy-empty { background: #FFFFFF; border: 1px solid #E4DFD4; padding: 40px 28px; text-align: center; }
      .symy-empty-h { font-family: var(--font-noto-serif-kr); font-size: 1.2rem; font-weight: 700; color: #241C18; margin-bottom: 10px; }
      .symy-empty-b { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.7; font-weight: 300; color: #6B5C50; word-break: keep-all; margin-bottom: 20px; }
      .symy-empty-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px; }

      .symy-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
      .symy-item { display: flex; align-items: center; gap: 12px; background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid var(--color-syus-stage-thrust); padding: 16px 18px; }
      .symy-item-link { flex: 1; display: flex; flex-direction: column; gap: 4px; text-decoration: none; min-width: 0; }
      .symy-item-title { font-family: var(--font-noto-sans-kr); font-size: 0.98rem; font-weight: 700; color: #241C18; word-break: keep-all; }
      .symy-item-meta { font-family: var(--font-noto-sans-kr); font-size: 0.76rem; color: #A79E90; }
      .symy-del { appearance: none; cursor: pointer; flex: 0 0 auto; font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #6B5C50; background: none; border: 1px solid #D4CFC1; padding: 6px 12px; }
      .symy-del:hover { color: #C0392B; border-color: #E4B4AD; }
      .symy-del:disabled { opacity: 0.5; cursor: default; }

      .symy-note { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #A79E90; margin-top: 16px; word-break: keep-all; }

      .symy-bridge { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 44px; padding-top: 26px; border-top: 1px solid #E0DBD0; }
      .symy-bridge-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px; }
      .symy-bridge-link.symy-bridge-muted { color: #6B5C50; border-bottom-color: #E0DBD0; font-weight: 500; }
      .symy-bridge-link:hover { opacity: 0.7; }
    `}</style>
  );
}
