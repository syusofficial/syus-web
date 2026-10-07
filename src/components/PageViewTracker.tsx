"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 방문자 트래커 — page_views 테이블에 1방문 1행 insert
 *
 * 설계 메모 (2026-06-06):
 * - 사장님 요청: 관리자 통계 탭에 일일·누적 방문자 노출 ("하루 몇 명 들렀다 갔는가")
 * - 정확도 80% — GA만큼 정밀하진 않지만 실시간성·데이터 소유권 우선
 * - 봇 필터: user-agent 기반 sniff (sites GET을 안 하는 봇은 어차피 트래커도 안 탐)
 * - 운영자 본인 트래픽 분리: profiles.role === 'admin' 이면 is_admin=true
 *   → 관리자 페이지에서 "운영자 제외/포함" 토글로 분리해서 볼 수 있음
 * - 세션 ID: sessionStorage 30분 갱신 (탭 닫으면 사라짐). UU 추정용 보조 키.
 * - 중복 방지: 같은 (session_id, path) 조합은 같은 페이지 새로고침 시 5초 디바운스
 * - 2026-10-07: 주소 꼬리표(utm_source/medium/campaign) 기록 추가 — 아래 readUtm() 설명 참고
 */

const STORAGE_KEY = "syus-pv-session";
const SESSION_TTL_MS = 30 * 60 * 1000;       // 30분
const DEDUPE_WINDOW_MS = 5 * 1000;            // 같은 경로 5초 내 중복 무시
// 2026-09-30 — 「GoogleOther」는 이름에 bot이 없어 빠져나갔다(8/6~8/8 공연목록 419세션 → 「92% 즉시 이탈」 오판의 원인).
// Google 수집기 계열과 헤드리스 브라우저·성능 측정기를 함께 막는다.
// 2026-10-06 — 같은 재측정에서 사람으로 잡힌 나머지 셋(네이버 Yeti · Dataprovider · Google-Read-Aloud)도 더한다.
const BOT_REGEX = /bot|crawler|spider|crawling|slurp|baidu|yandex|duckduckgo|googlebot|bingbot|facebookexternalhit|whatsapp|telegrambot|preview|googleother|google-inspectiontool|google-extended|headlesschrome|lighthouse|bytespider|petalsearch|yeti|dataprovider|google-read-aloud/i;

type SessionPayload = { id: string; expiresAt: number };

/**
 * 주소 꼬리표(UTM) — 2026-10-07 추가
 *
 * 인스타 스토리·DM·프로필 링크에서 들어온 방문을 구분하려고, 링크 끝에 붙인
 * ?utm_source=instagram&utm_medium=story&utm_campaign=… 값을 page_views에 함께 남긴다.
 *
 * - 꼬리표는 처음 들어온 화면 주소에만 붙어 있다. 그 뒤 사이트 안에서 옮겨 다니면 사라지므로
 *   sessionStorage(탭 단위, 30분 세션과 같은 수명)에 담아 두고 같은 세션의 다음 방문 기록에도 붙인다.
 *   → "스토리에서 온 사람이 몇 페이지를 봤나"를 session_id 없이도 바로 셀 수 있다.
 * - 세션 중간에 다른 꼬리표 링크로 다시 들어오면 새 값으로 덮어쓴다(마지막 유입 기준).
 * - 개인을 알아볼 수 있는 값이 아니다(우리가 링크에 직접 적은 글자). 100자로 자른다.
 *
 * ⚠ page_views에 utm_* 칸이 아직 없을 때(SQL 실행 전)도 방문 기록이 끊기지 않게 한다.
 *   꼬리표가 있는 방문만 utm_* 칸을 함께 보내고, 칸이 없어 거절되면 꼬리표를 빼고 한 번 더 보낸다.
 *   SQL: supabase/page_views_utm_2026-10-07.sql
 */
const UTM_STORAGE_KEY = "syus-pv-utm";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

// 이 탭에서 "칸 없음"을 한 번 확인했으면 그 뒤로는 꼬리표를 붙이지 않는다(요청 두 번 반복 방지).
let utmColumnsMissing = false;

function readUtm(): Utm | null {
  // 1) 지금 주소에 꼬리표가 있으면 그것을 쓰고 세션에 저장
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl: Utm = {};
    for (const key of UTM_KEYS) {
      const v = params.get(key)?.trim();
      if (v) fromUrl[key] = v.slice(0, 100);
    }
    if (Object.keys(fromUrl).length > 0) {
      try {
        sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
      } catch {
        /* 저장 불가 환경 — 이번 방문에만 붙인다 */
      }
      return fromUrl;
    }
  } catch {
    /* noop */
  }
  // 2) 없으면 같은 세션에 저장해 둔 값
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Utm;
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) return parsed;
    }
  } catch {
    /* noop */
  }
  return null;
}

// "칸이 없다"는 거절인지 — PostgREST는 PGRST204("Could not find the 'utm_source' column …")로 돌려준다.
function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "PGRST204" || err.code === "42703") return true;
  return /column/i.test(err.message ?? "") && /utm_/i.test(err.message ?? "");
}

function getOrCreateSessionId(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionPayload;
      if (parsed.expiresAt > Date.now()) {
        // TTL 연장
        parsed.expiresAt = Date.now() + SESSION_TTL_MS;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed.id;
      }
    }
  } catch {
    // sessionStorage 사용 불가 환경 (시크릿 일부, 차단 환경) → 1회성 ID
  }
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id, expiresAt: Date.now() + SESSION_TTL_MS } satisfies SessionPayload),
    );
  } catch {
    /* noop */
  }
  return id;
}

export default function PageViewTracker() {
  const pathname = usePathname();
  const lastTrackedRef = useRef<{ path: string; ts: number }>({ path: "", ts: 0 });

  useEffect(() => {
    if (!pathname) return;

    // 봇 필터 — 안 보내고 종료
    const ua = navigator.userAgent || "";
    if (BOT_REGEX.test(ua)) return;

    // 같은 경로 5초 디바운스 (React strict mode 이중 mount + fast 새로고침 대응)
    const now = Date.now();
    if (
      lastTrackedRef.current.path === pathname &&
      now - lastTrackedRef.current.ts < DEDUPE_WINDOW_MS
    ) {
      return;
    }
    lastTrackedRef.current = { path: pathname, ts: now };

    const send = async () => {
      const supabase = createClient();

      // 운영자(admin role) 본인 트래픽인지 판별 — 로그인 + admin이면 is_admin=true
      let isAdmin = false;
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.user.id)
            .single();
          isAdmin = profile?.role === "admin";
        }
      } catch {
        // 로그인 안 한 익명 방문 — 정상 흐름
      }

      const referrer = (document.referrer || "").slice(0, 500) || null;
      // 자기 자신에서 자기 자신으로 (내부 이동)은 referrer 없는 것과 동치 처리
      const refIsSelf =
        referrer !== null &&
        typeof window !== "undefined" &&
        referrer.startsWith(window.location.origin);

      const base = {
        path: pathname.slice(0, 500),
        referrer: refIsSelf ? null : referrer,
        session_id: getOrCreateSessionId(),
        user_agent: ua.slice(0, 300),
        is_admin: isAdmin,
      };

      // 꼬리표가 있을 때만 utm_* 칸을 붙인다 — 없는 방문은 예전과 똑같은 요청이다.
      const utm = utmColumnsMissing ? null : readUtm();
      if (!utm) {
        await supabase.from("page_views").insert(base);
        return;
      }

      const { error } = await supabase.from("page_views").insert({
        ...base,
        utm_source: utm.utm_source ?? null,
        utm_medium: utm.utm_medium ?? null,
        utm_campaign: utm.utm_campaign ?? null,
      });
      if (isMissingColumnError(error)) {
        // SQL 실행 전 — 꼬리표만 빼고 방문 1건은 반드시 남긴다.
        utmColumnsMissing = true;
        await supabase.from("page_views").insert(base);
      }
    };

    // 화면 그리기 끝난 뒤에 비동기로 — 페이지 로드 체감속도 보호
    const handle = window.setTimeout(() => {
      send().catch(() => {
        // 추적 실패는 사용자 경험에 영향 주지 않도록 조용히 흘림
      });
    }, 0);

    return () => window.clearTimeout(handle);
  }, [pathname]);

  return null;
}
