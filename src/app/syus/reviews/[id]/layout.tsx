import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 관람의 잔상(후기) 상세 — 서버 쪽 존재 확인 + 작품 제목 (2026-11-10 제작팀, 서치콘솔 색인 점검).
 *
 * 본문(page.tsx)은 "use client"라 서버는 후기가 있든 없든 「색인 허용」 빈 화면을 보냈다.
 * 여기서 후기가 있는지만 먼저 확인해 없으면 사이트 404 화면 + noindex로 보내고(응답 코드는 루트 loading.tsx 때문에 200으로 남는다), 있으면 작품 제목을 <title>에 싣는다.
 * 읽기 범위는 RLS "syus_rv read"(모두 공개)와 같다 — 새로 드러나는 정보는 없다.
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
    const { data } = await supabase.from("syus_reviews").select("work_title").eq("id", id).maybeSingle();
    title = (data?.work_title as string | undefined) ?? null;
  } catch {
    title = null;
  }
  if (!title) notFound();
  return {
    title: `「${title}」 관람 후기 · 관람의 잔상`,
    alternates: { canonical: `https://syus.co.kr/syus/reviews/${id}` },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
