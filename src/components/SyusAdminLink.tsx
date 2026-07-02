"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 시우스 헤더의 관리자 진입 링크. 운영자(profiles.role='admin')에게만 "관리" 노출.
 * 실제 관리 권한은 /syus/admin 및 RLS로 보장 — 이 링크는 편의용.
 */
export default function SyusAdminLink({ style }: { style?: React.CSSProperties }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || !mounted) return;
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (mounted) setIsAdmin(prof?.role === "admin");
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      if (!session?.user) { setIsAdmin(false); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (mounted) setIsAdmin(prof?.role === "admin");
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!isAdmin) return null;
  return <Link href="/syus/admin" style={style}>관리</Link>;
}
