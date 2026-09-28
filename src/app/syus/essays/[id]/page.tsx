import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import SyusLikeButton from "@/components/SyusLikeButton";
import SyusComments from "@/components/SyusComments";
import { ESSAY_SEO } from "@/lib/seo/syusSeo";
import { OG_SYUS } from "@/lib/ogCards";
import { buildBreadcrumbList } from "@/lib/structuredData";

/**
 * 주인장 견해글 상세 (/syus/essays/[id]) — 2026-09-28 서버 렌더링 전환 (제작팀).
 *
 * 왜 바꿨나: 예전엔 "use client" 페이지라 브라우저가 JS를 돌린 뒤에야 본문을 가져왔다.
 * 검색엔진 크롤러가 받는 HTML엔 "불러오는 중…" 한 줄뿐이었고, <title>도 28편 전부
 * 레이아웃 기본값("시우스 SYUS — 연기를 깊게 들여다보다") 하나로 같았다(라이브 확인).
 * → 이제 서버에서 글을 읽어 본문을 HTML에 실어 보내고, 글마다 제목·설명·OG·canonical을 만든다.
 *
 * 노출 기준은 예전과 같다: 공개 여부는 RLS "syus_e read"(published = true 또는 운영자)가 정한다.
 * 쿠키 세션을 싣는 서버 클라이언트를 쓰므로, 운영자는 예전처럼 비공개 글도 볼 수 있다
 * (대신 그런 글은 검색 색인 금지 처리).
 *
 * 좋아요·댓글은 로그인 상태에 따라 움직이는 부분이라 기존 클라이언트 컴포넌트 그대로 둔다.
 *
 * 제목 규칙: 화면의 h1은 DB 원래 제목(사장님 원고) 그대로. 검색용 제목·설명만
 * src/lib/seo/syusSeo.ts 의 ESSAY_SEO[원래 제목]에서 읽고, 항목이 없으면 원래 제목으로 돌아간다.
 */

const SITE_URL = "https://syus.co.kr";

type Essay = {
  id: string;
  user_id: string;
  title: string;
  excerpt: string | null;
  body: string;
  series_no: number | null;
  published: boolean;
  created_at: string;
  updated_at: string | null;
};

function fmt(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? ""
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 검색결과·SNS 카드용 한 줄 설명 — 줄바꿈·연속공백을 없애고 길이를 자른다. */
function flatten(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** 검색용 설명 — 기록팀 문구 → 발췌(excerpt) → 본문 앞부분 순으로 폴백 */
function describe(essay: Essay): string {
  return (
    ESSAY_SEO[essay.title]?.description ??
    flatten(essay.excerpt, 120) ??
    flatten(essay.body, 120) ??
    `${essay.title} — 시우스 주인장 견해글.`
  );
}

/**
 * generateMetadata와 페이지 본문이 같은 요청 안에서 두 번 조회하지 않도록 React cache로 묶는다.
 * id가 uuid 형식이 아니면 DB가 오류를 돌려주고 data는 null → "찾을 수 없음" 화면으로 간다.
 */
const getEssay = cache(async (id: string): Promise<Essay | null> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("syus_essays")
      .select("id, user_id, title, excerpt, body, series_no, published, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    return (data as Essay | null) ?? null;
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
  const essay = await getEssay(id);
  const canonical = `${SITE_URL}/syus/essays/${id}`;

  // 없는 글 — 검색에 남기지 않는다.
  if (!essay) {
    return {
      title: "주인장 견해글",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const title = ESSAY_SEO[essay.title]?.title ?? essay.title;
  const description = describe(essay);

  // 제목은 syus/layout.tsx의 title.template("%s · 시우스 SYUS")을 탄다.
  // og:title은 템플릿이 적용되지 않으므로 전체 문자열을 직접 적는다.
  const ogTitle = `${title} · 시우스 SYUS`;

  // ⚠ Next.js는 openGraph·twitter를 세그먼트 단위로 '통째로 교체'한다(부분 병합 아님).
  //    그래서 layout에 있던 siteName·locale·images를 여기서 다시 적어준다.
  return {
    title,
    description,
    alternates: { canonical },
    // 운영자만 볼 수 있는 비공개 글은 색인 금지
    ...(essay.published ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      siteName: "사유유사 SYUS",
      locale: "ko_KR",
      type: "article",
      publishedTime: essay.created_at,
      ...(essay.updated_at ? { modifiedTime: essay.updated_at } : {}),
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

export default async function EssayDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const essay = await getEssay(id);

  if (!essay) {
    return (
      <main className="syc-wrap">
        <p className="syc-loading">글을 찾을 수 없습니다.</p>
        <Link href="/syus/proscenium" className="syc-back" style={{ marginTop: 16 }}>← 주인장 견해글</Link>
      </main>
    );
  }

  const url = `${SITE_URL}/syus/essays/${essay.id}`;

  // 구조화 데이터(Article + 경로) — 공개 글에만 싣는다(비공개 초안이 검색엔진에 설명되지 않도록).
  const articleData = essay.published
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: ESSAY_SEO[essay.title]?.title ?? essay.title,
        description: describe(essay),
        datePublished: essay.created_at,
        dateModified: essay.updated_at ?? essay.created_at,
        inLanguage: "ko-KR",
        mainEntityOfPage: url,
        url,
        image: `${SITE_URL}${OG_SYUS.url}`,
        ...(essay.series_no != null ? { isPartOf: { "@type": "CreativeWorkSeries", name: "연기와 냉장고" } } : {}),
        author: { "@type": "Person", name: "주인장", url: `${SITE_URL}/syus/proscenium` },
        publisher: { "@type": "Organization", name: "사유유사 SYUS", url: SITE_URL },
      }
    : null;
  const breadcrumbData = essay.published
    ? buildBreadcrumbList([
        { name: "홈", path: "/" },
        { name: "시우스", path: "/syus" },
        { name: "주인장 견해글", path: "/syus/proscenium" },
        { name: essay.title },
      ])
    : null;

  return (
    <main className="syc-wrap" style={{ ["--c" as string]: "var(--color-syus-stage-proscenium)" } as React.CSSProperties}>
      {articleData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleData) }} />
      )}
      {breadcrumbData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData) }} />
      )}
      <Link href="/syus/proscenium" className="syc-back">← 주인장 견해글</Link>
      <article className="syc-detail">
        {essay.series_no != null && <span className="syc-card-meta">연기와 냉장고 · {String(essay.series_no).padStart(2, "0")}</span>}
        <h1 className="syc-detail-title">{essay.title}</h1>
        <p className="syc-detail-meta">주인장 · <time dateTime={essay.created_at}>{fmt(essay.created_at)}</time></p>
        <div className="syc-detail-body" style={{ fontSize: "1.02rem", lineHeight: 1.95 }}>
          {essay.body.split("\n\n").map((para, i) => {
            const trimmed = para.trim();
            const isNote = /^\d{4}\.\d{2}\.\d{2}/.test(trimmed) || trimmed.startsWith("(이 질문은");
            const isGlossary = trimmed.startsWith("※");
            return (
              <p key={i} className={isNote ? "syc-detail-note" : isGlossary ? "syc-detail-glossary" : undefined}>
                {para}
              </p>
            );
          })}
        </div>
        <div className="syc-detail-foot">
          <SyusLikeButton targetType="essay" targetId={essay.id} />
        </div>
      </article>
      <SyusComments targetType="essay" targetId={essay.id} />
      <nav className="syc-bridge">
        <Link href="/syus/proscenium" className="syc-bridge-link">← 주인장 견해글</Link>
        <Link href="/syus" className="syc-bridge-link is-muted">여섯 무대로</Link>
      </nav>
    </main>
  );
}
