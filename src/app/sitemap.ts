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

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    // 무대올림 (/muol)
    { url: `${BASE_URL}/muol`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/muol/shows`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/muol/shows/calendar`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/muol/universities`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/muol/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/muol/for-business`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/muol/archive`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/muol/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/muol/contact`, changeFrequency: "monthly", priority: 0.5 },
    // 시우스 (/syus)
    { url: `${BASE_URL}/syus`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/syus/about`, changeFrequency: "monthly", priority: 0.6 },
    // 공통
    { url: `${BASE_URL}/auth/login`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/auth/signup`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...showEntries,
  ];
}
