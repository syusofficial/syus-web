import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import SyusMonologueView, {
  MONOLOGUE_IN_PROGRESS,
  type SyusMonologue,
} from "@/components/SyusMonologueView";
import SyusMonologueLive from "@/components/SyusMonologueLive";
import { MONOLOGUE_SEO } from "@/lib/seo/syusSeo";
import { OG_SYUS } from "@/lib/ogCards";
import { buildBreadcrumbList } from "@/lib/structuredData";

/**
 * 창작 독백 상세 (/syus/monologues/[id]) — 2026-09-28 서버 렌더링 전환 (제작팀).
 *
 * 왜 바꿨나: 예전 "use client" 페이지는 크롤러에게 "불러오는 중…"만 보였고 <title>도 전부 같았다.
 * 이제 서버에서 독백을 읽어 본문을 HTML에 싣고, 독백마다 제목·설명·OG·canonical을 만든다.
 *
 * 노출 기준은 예전과 같다(RLS "syus_m read": is_public = true 또는 요청자 본인 또는 운영자).
 * 쿠키 세션을 싣는 서버 클라이언트로 읽으므로 요청자 본인은 자기 비공개 요청도 그대로 본다.
 * 검색 색인은 공개 처리된 완성 독백(is_public + generated_text)만 허용한다.
 *
 * 요청자 본인이 "생성 중" 화면을 볼 때만 클라이언트 컴포넌트(SyusMonologueLive)가
 * 몇 초마다 다시 읽어 완성되면 화면을 바꾼다 — 예전 폴링 동작 유지.
 *
 * 제목: 독백 테이블엔 제목 칸이 없어 char_type 앞머리에 「제목」이 들어 있다(시드 2026-09-09 주석).
 * 검색용 제목·설명은 src/lib/seo/syusSeo.ts 의 MONOLOGUE_SEO에서 읽는다 — 키는 `${char_type} · ${length_spec}`.
 * 항목이 없으면 char_type·감정 조합으로 되돌아간다.
 */

const SITE_URL = "https://syus.co.kr";

/** 검색결과·SNS 카드용 한 줄 설명 — 줄바꿈·연속공백을 없애고 길이를 자른다. */
function flatten(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** 검색에 내보내도 되는 독백인가 — 운영자가 공개 처리했고 본문이 있는 것만 */
function isIndexable(m: SyusMonologue) {
  return m.is_public && !!m.generated_text;
}

/**
 * MONOLOGUE_SEO 조회 키 — 기록팀과 맞춘 형식 `${char_type} · ${length_spec}`.
 * 같은 인물(char_type)로 1분판·2분판 두 벌이 있어 char_type만으로는 행이 갈리지 않는다.
 * (예: "「봉투」 여성 18~20세 · 1분판 · 272자"). length_spec이 비어 있으면 char_type만 쓴다.
 */
function seoKey(m: SyusMonologue): string | null {
  if (!m.char_type) return null;
  return m.length_spec ? `${m.char_type} · ${m.length_spec}` : m.char_type;
}

/** 검색용 제목·설명 — 기록팀 문구가 없으면 char_type·감정·길이 조합으로 폴백 */
function seoOf(m: SyusMonologue): { title: string; description: string } {
  const key = seoKey(m);
  const entry = key ? MONOLOGUE_SEO[key] : undefined;

  let title: string;
  if (entry) {
    title = entry.title;
  } else {
    // 폴백 제목에도 길이 표기(length_spec 앞머리, 예: "1분판")를 붙여 1분판·2분판 제목이 겹치지 않게 한다.
    const lengthLabel = m.length_spec?.split("·")[0].trim() || null;
    const base = [m.char_type, m.emotion].filter(Boolean).join(" · ") || "창작 독백";
    title = `${base}${lengthLabel ? ` (${lengthLabel})` : ""} — 창작 독백`;
  }

  // AI 기본법 §31 — 검색결과 설명에서도 AI 생성물임이 드러나도록 폴백 설명 앞에 표시한다.
  const description =
    entry?.description ??
    [`AI가 지은 창작 독백`, flatten(m.generated_text, 100)].filter(Boolean).join(" · ");

  return { title, description };
}

/** generateMetadata와 본문이 한 요청 안에서 두 번 조회하지 않도록 React cache로 묶는다. */
const getMonologue = cache(async (id: string): Promise<{ m: SyusMonologue | null; uid: string | null }> => {
  try {
    const supabase = await createClient();
    const [{ data: me }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("syus_monologues").select("*").eq("id", id).maybeSingle(),
    ]);
    return { m: (data as SyusMonologue | null) ?? null, uid: me.user?.id ?? null };
  } catch {
    return { m: null, uid: null };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { m } = await getMonologue(id);
  const canonical = `${SITE_URL}/syus/monologues/${id}`;

  // 없는 독백 / 비공개 요청 — 본인·운영자만 보는 화면이라 검색에 남기지 않는다.
  if (!m || !isIndexable(m)) {
    return {
      title: "창작 독백",
      robots: { index: false, follow: false },
      alternates: { canonical },
    };
  }

  const { title, description } = seoOf(m);
  const ogTitle = `${title} · 시우스 SYUS`;

  // ⚠ openGraph·twitter는 세그먼트 단위로 통째로 교체되므로 layout의 siteName·locale·images를 다시 적는다.
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
      publishedTime: m.created_at,
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

export default async function MonologueDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { m, uid } = await getMonologue(id);

  if (!m) {
    return (
      <main className="syc-wrap">
        <p className="syc-loading">독백을 찾을 수 없거나 비공개입니다.</p>
        <Link href="/syus/flex" className="syc-back" style={{ marginTop: 16 }}>← 창작 독백 아카이브</Link>
      </main>
    );
  }

  const isOwner = uid === m.user_id;

  // 요청자 본인이 생성 중 화면을 보는 경우에만 자동 갱신 컴포넌트를 쓴다.
  if (isOwner && MONOLOGUE_IN_PROGRESS.has(m.status)) {
    return <SyusMonologueLive initial={m} isOwner />;
  }

  // 경로(BreadcrumbList) — 공개 독백에만. 독백은 기사(Article)라기보다 AI 생성 창작물이라
  // Article 구조화 데이터는 붙이지 않고, 경로만 알린다.
  const breadcrumbData = isIndexable(m)
    ? buildBreadcrumbList([
        { name: "홈", path: "/" },
        { name: "시우스", path: "/syus" },
        { name: "창작 독백 아카이브", path: "/syus/flex" },
        { name: seoOf(m).title },
      ])
    : null;

  return (
    <>
      {breadcrumbData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbData) }} />
      )}
      <SyusMonologueView m={m} isOwner={isOwner} />
    </>
  );
}
