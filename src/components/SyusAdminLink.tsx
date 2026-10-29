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
    // 콜백 안에서 Supabase 조회를 바로 기다리면 인증 잠금과 서로 기다리는 교착이 생길 수 있다
    // (Supabase 공식 문서 경고). 조회는 콜백이 끝난 뒤로 미룬다. 되돌리지 말 것. (2026-10-29)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (!session?.user) { setIsAdmin(false); return; }
      const userId = session.user.id;
      setTimeout(async () => {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
        if (mounted) setIsAdmin(prof?.role === "admin");
      }, 0);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!isAdmin) return null;
  return <Link href="/syus/admin" style={style}>관리</Link>;
}
