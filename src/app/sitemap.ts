import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = "https://syus-web.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: shows } = await supabase
    .from("shows")
    .select("id, created_at")
    .eq("status", "approved");

  const showEntries: MetadataRoute.Sitemap = (shows ?? []).map((s) => ({
    url: `${BASE_URL}/shows/${s.id}`,
    lastModified: new Date(s.created_at),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/shows`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/auth/login`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/auth/signup`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    ...showEntries,
  ];
}
