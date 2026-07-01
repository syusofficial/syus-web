"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 독립 마이페이지 (/syus/mypage) — 2026-07-01.
 * 사장님 지시: 무대올림 마이페이지(/mypage)와 분리. 시우스 안에서 본인이 쓴 글 + 좋아요로 찜한 것을
 * 확인·수정. 두 마이페이지는 서로 오갈 수 있게 다리 제공.
 * 현재: 세션 인식 + 골격(내 글 / 찜한 글 탭)·빈 상태. 실제 목록·수정은 syus_* 테이블 연결 뒤(다음 단계).
 */

type Tab = "posts" | "likes";

export default function SyusMyPage() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("posts");

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <main className="symy-wrap"><p className="symy-loading">불러오는 중…</p><Style /></main>;
  }

  if (!email) {
    return (
      <main className="symy-wrap symy-center">
        <h1 className="symy-title">시우스 마이페이지</h1>
        <p className="symy-sub">로그인하면 내가 쓴 글과 찜해둔 글을 이곳에서 모아볼 수 있어요.</p>
        <Link href="/auth/login?next=/syus/mypage" className="symy-login">로그인하기 →</Link>
        <Style />
      </main>
    );
  }

  return (
    <main className="symy-wrap">
      <header className="symy-head">
        <p className="symy-eyebrow">My · 시우스 SYUS</p>
        <h1 className="symy-title">내 시우스</h1>
        <p className="symy-sub">{email}</p>
      </header>

      <div className="symy-tabs">
        <button type="button" className={`symy-tab ${tab === "posts" ? "is-on" : ""}`} onClick={() => setTab("posts")}>
          내가 쓴 글
        </button>
        <button type="button" className={`symy-tab ${tab === "likes" ? "is-on" : ""}`} onClick={() => setTab("likes")}>
          찜한 글
        </button>
      </div>

      {tab === "posts" ? (
        <section className="symy-panel">
          <div className="symy-empty">
            <p className="symy-empty-h">아직 남긴 글이 없어요.</p>
            <p className="symy-empty-b">여섯 무대 중 한 곳에서 첫 글을 남기면, 여기에서 모아 보고 수정할 수 있어요.</p>
            <Link href="/syus" className="symy-empty-link">여섯 무대 둘러보기 →</Link>
          </div>
          <p className="symy-note">※ 글쓰기·목록·수정 기능은 시우스 데이터베이스 연결 뒤 이 자리에 열립니다.</p>
        </section>
      ) : (
        <section className="symy-panel">
          <div className="symy-empty">
            <p className="symy-empty-h">아직 찜한 글이 없어요.</p>
            <p className="symy-empty-b">마음에 드는 견해글·후기·독백에 좋아요를 누르면, 여기에 모여 언제든 다시 꺼내볼 수 있어요.</p>
            <Link href="/syus" className="symy-empty-link">둘러보러 가기 →</Link>
          </div>
          <p className="symy-note">※ 좋아요(찜) 기능은 시우스 데이터베이스 연결 뒤 이 자리에 열립니다.</p>
        </section>
      )}

      {/* 두 마이페이지 다리 */}
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
      .symy-note { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #A79E90; margin-top: 16px; word-break: keep-all; }

      .symy-bridge { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 44px; padding-top: 26px; border-top: 1px solid #E0DBD0; }
      .symy-bridge-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px; }
      .symy-bridge-link.symy-bridge-muted { color: #6B5C50; border-bottom-color: #E0DBD0; font-weight: 500; }
      .symy-bridge-link:hover { opacity: 0.7; }
    `}</style>
  );
}
