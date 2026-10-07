import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://syus.co.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("shows")
    .select("id, created_at")
    .eq("status", "approved");

  const showEntries: MetadataRoute.Sitemap = (shows ?? []).map((s) => ({
    url: `${BASE_URL}/muol/shows/${s.id}`,
    lastModified: new Date(s.created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // 시우스 견해글(운영자 발행) — 테이블 syus_essays, 공개 조건은 published = true.
  // (스키마: supabase/syus_community_full.sql / RLS "syus_e read" 도 published = true 를 공개로 본다)
  // 2026-08-03: 시우스 동적 콘텐츠가 sitemap에 하나도 없어 견해글부터 채운다.
  const { data: essays } = await supabase
    .from("syus_essays")
    .select("id, updated_at")
    .eq("published", true);

  const essayEntries: MetadataRoute.Sitemap = (essays ?? []).map((e) => ({
    url: `${BASE_URL}/syus/essays/${e.id}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // 시우스 창작 독백 — 2026-09-28 추가. 그 전엔 개별 독백 URL이 sitemap에 0개였다.
  // 공개 조건은 /syus/flex 목록과 같다: 운영자 공개 처리(is_public) + 본문 있음(generated_text).
  // (RLS "syus_m read"도 비로그인에겐 is_public = true 만 보여준다)
  const { data: monologues } = await supabase
    .from("syus_monologues")
    .select("id, updated_at")
    .eq("is_public", true)
    .not("generated_text", "is", null);

  const monologueEntries: MetadataRoute.Sitemap = (monologues ?? []).map((m) => ({
    url: `${BASE_URL}/syus/monologues/${m.id}`,
    lastModified: new Date(m.updated_at),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    // 사유유사 (회사 소개·CI) — 게이트웨이 지붕 배지에서만 연결되므로 내부 링크가 하나뿐이다.
    // 사이트맵에서 빠지면 검색엔진 발견이 늦어진다.
    { url: `${BASE_URL}/company`, changeFrequency: "monthly", priority: 0.7 },
    // 무대올림 (/muol)
    { url: `${BASE_URL}/muol`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/muol/shows`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/muol/shows/calendar`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/muol/universities`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/muol/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/muol/for-business`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/muol/production-service`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/muol/archive`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/muol/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/muol/contact`, changeFrequency: "monthly", priority: 0.5 },
    // 시우스 (/syus) — 여섯 무대(2026-08-03 추가. 그전엔 루트와 소개 2개뿐이라 실질 콘텐츠가 통째로 빠져 있었다)
    { url: `${BASE_URL}/syus`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/syus/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/syus/proscenium`, changeFrequency: "weekly", priority: 0.7 },  // 주인장 견해글
    { url: `${BASE_URL}/syus/thrust`, changeFrequency: "weekly", priority: 0.7 },      // 연기 고민 QnA
    { url: `${BASE_URL}/syus/arena`, changeFrequency: "weekly", priority: 0.7 },       // 자유 커뮤니티
    { url: `${BASE_URL}/syus/blackbox`, changeFrequency: "weekly", priority: 0.7 },    // 관람의 잔상
    { url: `${BASE_URL}/syus/flex`, changeFrequency: "weekly", priority: 0.7 },        // 창작 독백 아카이브
    { url: `${BASE_URL}/syus/corridor`, changeFrequency: "weekly", priority: 0.7 },    // 책 서재
    // 공통
    // 2026-10-07 — 로그인·가입 화면(/auth/*)은 뺐다. 검색 결과에 걸려도 읽을 내용이 없는 문이고,
    // 사이트맵에 올리면 검색엔진이 실제 콘텐츠보다 먼저 이 화면들을 긁어 간다.
    // 대신 src/app/auth/layout.tsx 에서 noindex(follow는 유지)를 건다.
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...showEntries,
    ...essayEntries,
    ...monologueEntries,
  ];
}
