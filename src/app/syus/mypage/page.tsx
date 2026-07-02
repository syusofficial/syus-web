"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 독립 마이페이지 (/syus/mypage).
 * 6섹션 전체에서 내가 쓴 글 + 좋아요(찜)한 글을 모아 본다. 각 항목 → 해당 상세(그곳에서 수정·삭제).
 * 테이블 미생성/빈 경우 그레이스풀. 무대올림 마이페이지와 상호 다리.
 */

type Tab = "posts" | "likes";
type Item = { key: string; title: string; href: string; label: string; created_at: string };

function fmt(iso: string) { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; }

// 섹션 매핑
const MY_SOURCES = [
  { t: "syus_questions", sel: "id, title, created_at", titleKey: "title", label: "연기 고민 QnA", href: (id: string) => `/syus/qna/${id}` },
  { t: "syus_posts", sel: "id, title, created_at", titleKey: "title", label: "자유 커뮤니티", href: (id: string) => `/syus/community/${id}` },
  { t: "syus_reviews", sel: "id, work_title, created_at", titleKey: "work_title", label: "관람의 잔상", href: (id: string) => `/syus/reviews/${id}` },
  { t: "syus_books", sel: "id, title, created_at", titleKey: "title", label: "책 서재", href: (id: string) => `/syus/books/${id}` },
  { t: "syus_monologues", sel: "id, char_type, created_at", titleKey: "char_type", label: "창작 독백", href: (id: string) => `/syus/monologues/${id}` },
  { t: "syus_essays", sel: "id, title, created_at", titleKey: "title", label: "주인장 견해글", href: (id: string) => `/syus/essays/${id}` },
];
const LIKE_MAP: Record<string, { t: string; sel: string; titleKey: string; label: string; href: (id: string) => string }> = {
  question: { t: "syus_questions", sel: "id, title", titleKey: "title", label: "연기 고민 QnA", href: (id) => `/syus/qna/${id}` },
  post: { t: "syus_posts", sel: "id, title", titleKey: "title", label: "자유 커뮤니티", href: (id) => `/syus/community/${id}` },
  review: { t: "syus_reviews", sel: "id, work_title", titleKey: "work_title", label: "관람의 잔상", href: (id) => `/syus/reviews/${id}` },
  book: { t: "syus_books", sel: "id, title", titleKey: "title", label: "책 서재", href: (id) => `/syus/books/${id}` },
  essay: { t: "syus_essays", sel: "id, title", titleKey: "title", label: "주인장 견해글", href: (id) => `/syus/essays/${id}` },
  monologue: { t: "syus_monologues", sel: "id, char_type", titleKey: "char_type", label: "창작 독백", href: (id) => `/syus/monologues/${id}` },
};

// 마이페이지 섹션 그룹(6무대 순서·색)
const SECTIONS = [
  { label: "주인장 견해글", color: "var(--color-syus-stage-proscenium)" },
  { label: "연기 고민 QnA", color: "var(--color-syus-stage-thrust)" },
  { label: "자유 커뮤니티", color: "var(--color-syus-stage-arena)" },
  { label: "관람의 잔상", color: "var(--color-syus-stage-blackbox)" },
  { label: "창작 독백", color: "var(--color-syus-stage-flex)" },
  { label: "책 서재", color: "var(--color-syus-stage-corridor)" },
];

export default function SyusMyPage() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");
  const [myPosts, setMyPosts] = useState<Item[]>([]);
  const [liked, setLiked] = useState<Item[]>([]);

  const loadData = useCallback(async (id: string) => {
    const supabase = createClient();
    // 내 글 — 섹션별 조회 후 병합
    const mine: Item[] = [];
    await Promise.all(MY_SOURCES.map(async (s) => {
      try {
        const { data } = await supabase.from(s.t).select(s.sel).eq("user_id", id).order("created_at", { ascending: false });
        const rows = ((data ?? []) as unknown) as Record<string, unknown>[];
        rows.forEach((r) => {
          mine.push({ key: `${s.t}:${r.id as string}`, title: (r[s.titleKey] as string) || s.label, href: s.href(r.id as string), label: s.label, created_at: r.created_at as string });
        });
      } catch { /* 테이블 미생성 등 무시 */ }
    }));
    mine.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setMyPosts(mine);

    // 찜한 글 — 좋아요 목록 → 타입별 제목 조회
    try {
      const { data: likes } = await supabase.from("syus_likes").select("target_type, target_id, created_at").eq("user_id", id).order("created_at", { ascending: false });
      const rows = ((likes ?? []) as unknown) as { target_type: string; target_id: string; created_at: string }[];
      const byType: Record<string, string[]> = {};
      rows.forEach((l) => { if (LIKE_MAP[l.target_type]) { (byType[l.target_type] ??= []).push(l.target_id); } });
      const titleMap: Record<string, { title: string; href: string; label: string }> = {};
      await Promise.all(Object.entries(byType).map(async ([type, ids]) => {
        const m = LIKE_MAP[type];
        const { data } = await supabase.from(m.t).select(m.sel).in("id", ids);
        const rows2 = ((data ?? []) as unknown) as Record<string, unknown>[];
        rows2.forEach((r) => {
          titleMap[`${type}:${r.id as string}`] = { title: (r[m.titleKey] as string) || m.label, href: m.href(r.id as string), label: m.label };
        });
      }));
      const likedItems: Item[] = [];
      rows.forEach((l) => {
        const hit = titleMap[`${l.target_type}:${l.target_id}`];
        if (hit) likedItems.push({ key: `${l.target_type}:${l.target_id}`, title: hit.title, href: hit.href, label: hit.label, created_at: l.created_at });
      });
      setLiked(likedItems);
    } catch { setLiked([]); }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      const id = data.user?.id ?? null;
      setUid(id);
      setEmail(data.user?.email ?? null);
      if (id) await loadData(id);
      setReady(true);
    });
    return () => { mounted = false; };
  }, [loadData]);

  if (!ready) return <main className="syc-wrap"><p className="syc-loading">불러오는 중…</p></main>;

  if (!uid) {
    return (
      <main className="syc-wrap" style={{ textAlign: "center", ["--c" as string]: "#0B5563" } as React.CSSProperties}>
        <h1 className="syc-title">시우스 마이페이지</h1>
        <p className="syc-lead" style={{ fontSize: "1rem" }}>로그인하면 내가 쓴 글과 찜해둔 글을 이곳에서 모아볼 수 있어요.</p>
        <Link href="/auth/login?next=/syus/mypage" className="syc-btn" style={{ background: "#0B5563" }}>로그인하기 →</Link>
      </main>
    );
  }

  const list = tab === "posts" ? myPosts : liked;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "#0B5563" } as React.CSSProperties}>
      <span className="syc-badge syc-badge--static">My · 시우스 SYUS</span>
      <h1 className="syc-title">내 시우스</h1>
      <p className="syc-tagline" style={{ color: "#6B5C50", fontWeight: 400 }}>{email ?? "로그인됨"}</p>

      <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid #E0DBD0", marginBottom: "28px", marginTop: "20px" }}>
        <button type="button" className="symy-tab" data-on={tab === "posts"} onClick={() => setTab("posts")}>내가 쓴 글{myPosts.length ? ` (${myPosts.length})` : ""}</button>
        <button type="button" className="symy-tab" data-on={tab === "likes"} onClick={() => setTab("likes")}>찜한 글{liked.length ? ` (${liked.length})` : ""}</button>
      </div>

      {list.length === 0 ? (
        <div className="syc-empty">
          <p className="syc-empty-h">{tab === "posts" ? "아직 남긴 글이 없어요." : "아직 찜한 글이 없어요."}</p>
          <p className="syc-empty-b">
            {tab === "posts" ? "여섯 무대 중 한 곳에서 글을 남기면 여기에 모여요." : "마음에 드는 글에 찜(♥)을 누르면 여기에 모여요."}
          </p>
          <Link href="/syus" className="syc-empty-link">여섯 무대 둘러보기 →</Link>
        </div>
      ) : (
        <div className="symy-groups">
          {SECTIONS.map((sec) => {
            const group = list.filter((it) => it.label === sec.label);
            return (
              <section key={sec.label} className="symy-group">
                <div className="symy-group-h" style={{ ["--c" as string]: sec.color } as React.CSSProperties}>
                  <span className="symy-dot" />
                  <span className="symy-group-name">{sec.label}</span>
                  <span className="symy-group-count">{group.length}</span>
                </div>
                {group.length > 0 ? (
                  <ul className="syc-list">
                    {group.map((it) => (
                      <li key={it.key + it.created_at}>
                        <Link href={it.href} className="syc-item">
                          <span className="syc-item-title">{it.title}</span>
                          <span className="syc-item-meta" style={{ marginLeft: 0 }}>{fmt(it.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="symy-none">{tab === "posts" ? "아직 남긴 글이 없어요." : "아직 찜한 글이 없어요."}</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p className="syc-note">※ 각 글은 눌러 들어가면 그 자리에서 수정·삭제할 수 있어요.</p>

      <nav className="syc-bridge">
        <Link href="/mypage" className="syc-bridge-link">무대올림 마이페이지 →</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
        <Link href="/muol" className="syc-bridge-link is-muted">무대올림으로</Link>
      </nav>

      <style>{`
        .symy-tab { appearance: none; background: none; border: 0; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.95rem; font-weight: 600; color: #A79E90; padding: 12px 6px; margin-bottom: -1px; border-bottom: 2px solid transparent; }
        .symy-tab[data-on="true"] { color: #241C18; border-bottom-color: #0B5563; }
        .symy-groups { display: grid; gap: 30px; }
        .symy-group-h { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
        .symy-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c, #0B5563); }
        .symy-group-name { font-family: var(--font-noto-serif-kr); font-size: 1.08rem; font-weight: 700; color: #241C18; }
        .symy-group-count { font-family: var(--font-inter); font-size: 0.78rem; font-weight: 600; color: var(--c, #0B5563); }
        .symy-none { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; color: #B9B1A2; padding: 4px 2px; }
      `}</style>
    </main>
  );
}
