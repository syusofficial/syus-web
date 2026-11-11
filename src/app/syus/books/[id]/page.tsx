import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  // 2026-11-11 — 운영자가 넣는 읽기 안내(독자 반응 요약·배우 지망생 활용). 칸 추가 SQL:
  // supabase/syus_books_reader_guide_2026-11-11.sql. SQL 실행 전에도 화면이 깨지지 않도록 모두 선택 칸으로 둔다.
  reader_reception?: string | null;
  reader_sources?: unknown;
  actor_guide?: string | null;
  read_level?: number | null;
  for_whom?: string | null;
};

type Source = { name: string; url: string };

/** reader_sources(jsonb) → 화면에 걸 출처 목록. http(s) 주소만 링크로 쓴다. */
function sourcesOf(raw: unknown): Source[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const { name, url } = s as { name?: unknown; url?: unknown };
    if (typeof name !== "string" || !name.trim()) return [];
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) return [];
    return [{ name: name.trim(), url }];
  });
}

/** 난이도 1~3 → ●●○ */
function levelDots(n: number) {
  const v = Math.min(3, Math.max(1, Math.round(n)));
  return "●".repeat(v) + "○".repeat(3 - v);
}

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
      // 2026-11-11 — 칸 이름을 나열하지 않고 "*"로 읽는다. 읽기 안내 칸(reader_*)을 추가하는 SQL이
      // 코드 배포보다 늦게 실행돼도 「없는 칸」 오류로 책 화면 전체가 멈추지 않게 하기 위해서다.
      .select("*")
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

  // 없는 책(삭제된 책) — 사이트 404 화면 + noindex (2026-11-10).
  // 응답 코드는 루트 loading.tsx 때문에 200으로 남는다 — 자세한 사정은 muol/shows/[id]/page.tsx 같은 자리 주석.
  if (!found) notFound();

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
        {/* 2026-11-11 — 읽기 안내 두 칸(서치콘솔 「크롤링됨-색인 안 됨」 대응, 사장님 결정).
            등록자 본인 후기(note·rating)와 섞지 않는다 — 별점 없이 난이도·추천 대상만. 출처는 링크로 밝힌다.
            표시 방침: 사장님 11-11 지시로 이 두 칸에는 AI 표시를 달지 않는다(위 「책 소개」의 표시는 그대로). */}
        {book.reader_reception && (
          <div className="syc-detail-body">
            <span className="syc-hint">독자 반응</span>
            <p>{book.reader_reception}</p>
            {sourcesOf(book.reader_sources).length > 0 && (
              <p className="syc-hint" style={{ marginTop: 8 }}>
                출처:{" "}
                {sourcesOf(book.reader_sources).map((s, i) => (
                  <span key={`${i}-${s.url}`}>
                    {i > 0 && " · "}
                    <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" style={{ textDecoration: "underline" }}>
                      {s.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
        {book.actor_guide && (
          <div className="syc-detail-body">
            <span className="syc-hint">배우 지망생에게</span>
            <p>{book.actor_guide}</p>
            {(book.read_level || book.for_whom) && (
              <p className="syc-hint" style={{ marginTop: 8 }}>
                {book.read_level ? <>난이도 <span aria-label={`3단계 중 ${book.read_level}단계`}>{levelDots(book.read_level)}</span></> : null}
                {book.read_level && book.for_whom ? " · " : null}
                {book.for_whom ? `이런 분께: ${book.for_whom}` : null}
              </p>
            )}
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
