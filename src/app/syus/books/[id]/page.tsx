import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";
import SyusReportButton from "@/components/SyusReportButton";
import { bookSeo, bookAuthorName } from "@/lib/seo/syusSeo";
import { OG_SYUS } from "@/lib/ogCards";
import { buildBreadcrumbList } from "@/lib/structuredData";
import BookOwnerDelete from "./BookOwnerDelete";

/**
 * 책 서재 상세 (/syus/books/[id]) — 2026-10-07 서버 렌더링 전환 (제작팀).
 * 견해글 상세(src/app/syus/essays/[id]/page.tsx, 2026-09-28)와 같은 구조다.
 *
 * 왜 바꿨나: 예전엔 "use client" 페이지라 검색 로봇이 받는 첫 HTML엔 「불러오는 중…」 한 줄뿐이었고,
 * <title>도 24권 모두 레이아웃 기본값 하나였다(기록팀 10-07 라이브 실측).
 * → 이제 서버에서 책을 읽어 제목·소개·AI 표시를 HTML에 실어 보내고, 책마다 제목·설명·OG·canonical을 만든다.
 *
 * 검색 제목·설명 규칙: src/lib/seo/syusSeo.ts 의 bookSeo() (기록팀 10-07 규칙, 자동 생성).
 *
 * 공개 범위: syus_books에는 비공개·숨김 상태 칸이 없다. RLS "syus_b read"가 모두에게 읽기를 허용하고
 * (서가 목록 /syus/corridor도 전부 보여 준다), 문제 있는 책은 운영자가 삭제한다(신고 → 관리자 화면).
 * 그래서 화면·메타데이터·사이트맵에 나가는 범위가 예전 화면과 같다 — 새로 드러나는 것은 없다.
 *
 * 움직이는 부분(좋아요·댓글·신고·본인 삭제)은 클라이언트 컴포넌트 그대로다.
 * 등록자 이름은 profiles RLS상 본인·운영자만 읽혀, 다른 사람에겐 예전처럼 「익명」으로 보인다.
 */

const SITE_URL = "https://syus.co.kr";

type Book = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  topic: string | null;
  rating: number | null;
  note: string | null;
  intro: string | null;
  cover_url: string | null;
  created_at: string;
  updated_at: string | null;
};

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="syc-stars">
      {"★".repeat(n)}
      <span className="off">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/**
 * generateMetadata와 페이지 본문이 같은 요청 안에서 두 번 조회하지 않도록 React cache로 묶는다.
 * id가 uuid 형식이 아니면 DB가 오류를 돌려주고 data는 null → "찾을 수 없음" 화면으로 간다.
 */
const getBook = cache(async (id: string): Promise<{ book: Book; ownerName: string } | null> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("syus_books")
      .select("id, user_id, title, author, topic, rating, note, intro, cover_url, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const book = data as Book;
    const { data: p } = await supabase.from("profiles").select("name").eq("id", book.user_id).maybeSingle();
    return { book, ownerName: (p?.name as string) || "익명" };
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const found = await getBook(id);
  const canonical = `${SITE_URL}/syus/books/${id}`;

  // 없는 책 — 검색에 남기지 않는다.
  if (!found) {
    return {
      title: "책 서재",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const { title, description } = bookSeo(found.book);
  // 제목은 syus/layout.tsx의 title.template("%s · 시우스 SYUS")을 탄다. og:title은 템플릿이 적용되지 않아 직접 붙인다.
  const ogTitle = `${title} · 시우스 SYUS`;

  // ⚠ Next.js는 openGraph·twitter를 세그먼트 단위로 '통째로 교체'한다 — layout의 siteName·locale·images를 다시 적는다.
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: "사유유사 SYUS",
      locale: "ko_KR",
      type: "article",
      publishedTime: found.book.created_at,
      ...(found.book.updated_at ? { modifiedTime: found.book.updated_at } : {}),
      images: [OG_SYUS],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [OG_SYUS.url],
    },
  };
}

/** JSON-LD를 <script> 안에 넣을 때 본문 속 "<" 가 태그로 해석되지 않도록 이스케이프 */
function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getBook(id);

  if (!found) {
    return (
      <main className="syc-wrap">
        <p className="syc-loading">책을 찾을 수 없습니다.</p>
        <Link href="/syus/corridor" className="syc-back" style={{ marginTop: 16 }}>← 책 서재</Link>
      </main>
    );
  }

  const { book, ownerName } = found;
  const url = `${SITE_URL}/syus/books/${book.id}`;
  const authorName = bookAuthorName(book.author);

  // 구조화 데이터 — 책(Book) + 경로. 별점(rating)은 등록자 한 사람의 값이라 AggregateRating으로 싣지 않는다.
  const bookData = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    ...(authorName ? { author: { "@type": "Person", name: authorName } } : {}),
    description: bookSeo(book).description,
    url,
    mainEntityOfPage: url,
  };
  const breadcrumbData = buildBreadcrumbList([
    { name: "홈", path: "/" },
    { name: "시우스", path: "/syus" },
    { name: "책 서재", path: "/syus/corridor" },
    { name: book.title },
  ]);

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-corridor)" } as React.CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(bookData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData) }} />
      <Link href="/syus/corridor" className="syc-back">← 책 서재</Link>
      <article className="syc-detail">
        <div className="syc-card-row">
          {book.topic && <span className="syc-tag">{book.topic}</span>}
          {book.rating ? <Stars n={book.rating} /> : <span />}
        </div>
        <h1 className="syc-detail-title">{book.title}</h1>
        <p className="syc-detail-meta">
          {book.author ? `${book.author} · ` : ""}등록 {ownerName} · <time dateTime={book.created_at}>{fmt(book.created_at)}</time>
        </p>
        {book.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.cover_url} alt={book.title} className="syc-media" style={{ maxWidth: "260px" }} />
        )}
        {/* intro = 서가 소개(AI 초안·사실만), note = 등록자 본인의 한 줄 후기. 둘을 섞지 않는다 — 소개가 후기처럼 읽히면 안 된다.
            AI 표시(「AI 생성 초안」)는 서버 HTML에 함께 나간다 — AI 기본법 §31. */}
        {book.intro && (
          <div className="syc-detail-body">
            <span className="syc-hint">책 소개 · AI 생성 초안, 운영자 검토</span>
            <p>{book.intro}</p>
          </div>
        )}
        {book.note && (
          <div className="syc-detail-body">
            {book.intro && <span className="syc-hint">등록자의 한 줄</span>}
            <p>{book.note}</p>
          </div>
        )}
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="book" targetId={book.id} />
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <SyusReportButton targetType="book" targetId={book.id} />
            <BookOwnerDelete bookId={book.id} ownerId={book.user_id} />
          </div>
        </div>
      </article>
      <SyusComments targetType="book" targetId={book.id} />
      <nav className="syc-bridge">
        <Link href="/syus/corridor" className="syc-bridge-link">← 책 서재</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
