import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 연기 고민 QnA 질문 상세 — 서버 쪽 존재 확인 + 질문 제목 (2026-11-10 제작팀, 서치콘솔 색인 점검).
 *
 * 본문(page.tsx)은 "use client"라 서버는 질문이 있든 없든 「색인 허용」 빈 화면을 보냈다.
 * 여기서 질문이 있는지만 먼저 확인해 없으면 사이트 404 화면 + noindex로 보내고(응답 코드는 루트 loading.tsx 때문에 200으로 남는다), 있으면 질문 제목을 <title>에 싣는다.
 * 읽기 범위는 RLS "syus_q read"(모두 공개)와 같다 — 새로 드러나는 정보는 없다.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let title: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("syus_questions").select("title").eq("id", id).maybeSingle();
    title = (data?.title as string | undefined) ?? null;
  } catch {
    title = null;
  }
  if (!title) notFound();
  return {
    title: `${title} · 연기 고민 QnA`,
    alternates: { canonical: `https://syus.co.kr/syus/qna/${id}` },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
