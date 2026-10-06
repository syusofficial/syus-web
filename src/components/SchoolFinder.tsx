"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DEPARTMENTS, fullName, type Department } from "@/lib/universities";

/**
 * 학교 이름으로 무대 찾기 — 무대올림 홈 첫 화면 (2026-10-06 사장님 지시, 처음 이름은 「우리 학교 찾기」)
 *
 * 왜: 학과 명부는 이미 꽉 차 있는데 첫 화면에서 닿을 길이 없었다. 학과 담당자가 들어와
 * 「우리 학교가 여기 있나」를 확인하는 순간이 곧 입점의 첫 걸음이다(Yelp의 「내 가게 찾기」와 같은 자리).
 * 명부에서 학과를 고르면 그 학과의 공연 또는 「첫 무대 올리기」로 잇고,
 * 명부에 없으면 인스타그램·카카오톡 채널·홈페이지 문의로 알려 달라고 안내한다.
 *
 * 무대올림이 「대신 올려 드린다」는 약속은 하지 않는다(2026-10-06 사장님 결정 — 무료 등록 대행은 열지 않음).
 * 데이터는 lib/universities.ts 상수(약 15KB)를 그대로 쓴다 — 서버 왕복 없이 글자를 칠 때마다 걸러진다.
 *
 * 이름(2026-10-06 사장님 승인): 「우리 학교 찾기」 → 「학교 이름으로 무대 찾기」.
 * 검색창이 무엇을 찾느냐가 곧 사이트의 정체로 읽힌다 — 「학교」를 찾으면 입시 정보 사이트처럼 보인다.
 * 찾는 것은 무대이고 학교 이름은 열쇠일 뿐이다. 「우리 학교」는 학과 사람만의 말이라 관객에게도 맞게 바꿨다.
 */

const MAX_RESULTS = 6;
const KAKAO_CHANNEL = "https://pf.kakao.com/_xkPVTX";
const INSTAGRAM = "https://www.instagram.com/syus_official";

const compact = (s: string) => s.replace(/[\s()·]/g, "").toLowerCase();

/** 「동덕여대」→동덕여자대학교, 「한예종」→한국예술종합학교처럼 줄임말을 받기 위해
 *  (첫 화면 예시는 한예종·성균관대·연세대 — 2026-10-06 사장님 지정)
 *  학교 이름의 첫 글자에서 시작해 글자 순서대로 들어 있는지 본다. */
function isAbbrevOf(q: string, school: string): boolean {
  if (!q || school[0] !== q[0]) return false;
  let i = 0;
  for (const ch of school) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

/** 0 = 학교 이름에 그대로 들어 있음, 1 = 줄임말, 2 = 학과 이름에 들어 있음, -1 = 아님 */
function scoreOf(q: string, d: Department): number {
  const school = compact(d.school);
  if (school.includes(q)) return 0;
  if (q.length >= 2 && isAbbrevOf(q, school)) return 1;
  if (q.length >= 2 && compact(d.dept).includes(q)) return 2;
  return -1;
}

function track(name: string) {
  // Clarity 사용자 이벤트 — 검색어 자체는 보내지 않고 「찾았다/못 찾았다」만 센다.
  try {
    (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity?.("event", name);
  } catch {
    /* 분석이 막혀 있어도 검색은 그대로 동작해야 한다 */
  }
}

export default function SchoolFinder({ showCounts }: { showCounts: Record<string, number> }) {
  const [query, setQuery] = useState("");
  const lastTracked = useRef("");
  const q = compact(query);

  const matches = useMemo(() => {
    if (!q) return [];
    return DEPARTMENTS.map((d) => ({ d, s: scoreOf(q, d) }))
      .filter((m) => m.s >= 0)
      .sort((a, b) => a.s - b.s)
      .map((m) => m.d);
  }, [q]);

  const shown = matches.slice(0, MAX_RESULTS);
  const rest = matches.length - shown.length;

  // 결과가 정해진 뒤 한 번만 센다(글자마다 세지 않게 — 입력을 멈추고 칸을 떠날 때).
  const onBlur = () => {
    if (!q || lastTracked.current === q) return;
    lastTracked.current = q;
    track(matches.length > 0 ? "school_finder_found" : "school_finder_none");
  };

  return (
    <div className="max-w-xl mb-10 md:mb-14">
      <label
        htmlFor="school-finder"
        className="block text-[0.95rem] mb-3"
        style={{ fontFamily: "var(--font-noto-serif-kr)", color: "#2B211C", fontWeight: 600 }}
      >
        학교 이름으로 무대 찾기
      </label>
      <div className="relative">
        <input
          id="school-finder"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onBlur={onBlur}
          placeholder="예: 한예종, 성균관대, 연세대"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby="school-finder-hint"
          className="w-full px-5 py-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
          style={{
            fontFamily: "var(--font-noto-sans-kr)",
            backgroundColor: "#FFFFFF",
            border: "1px solid #8C837C",
            color: "#2B211C",
          }}
        />
      </div>
      <p id="school-finder-hint" className="sr-only">
        입력하는 대로 아래에 학과 명부의 학과가 나타납니다.
      </p>

      {/* 결과 — 화면 낭독기가 바뀐 결과를 읽도록 polite 영역으로 둔다 */}
      <div aria-live="polite">
        {q && matches.length > 0 && (
          <ul className="mt-4 space-y-3">
            {shown.map((d) => {
              const name = fullName(d);
              const count = showCounts[name] ?? 0;
              return (
                <li
                  key={name}
                  className="px-5 py-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #D4CFC1" }}
                >
                  <p
                    className="text-[0.95rem] leading-relaxed"
                    style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#2B211C", fontWeight: 600, wordBreak: "keep-all" }}
                  >
                    {d.school} {d.dept}
                  </p>
                  <p className="text-[0.82rem] leading-relaxed mt-1 mb-3" style={{ color: "#5A4A3E", wordBreak: "keep-all" }}>
                    {d.region} · {d.genre}
                    {count > 0 ? ` · 오른 무대 ${count}` : " · 이 학과의 첫 무대를 기다립니다"}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm" style={{ fontFamily: "var(--font-noto-sans-kr)" }}>
                    {count > 0 && (
                      <Link
                        href={`/muol/shows?school=${encodeURIComponent(name)}`}
                        className="underline underline-offset-4"
                        style={{ color: "#0B5563", fontWeight: 600 }}
                      >
                        공연 보기 →
                      </Link>
                    )}
                    <Link
                      href="/muol/performer"
                      className="underline underline-offset-4"
                      style={{ color: "#0B5563", fontWeight: 600 }}
                    >
                      이 학과 공연 올리기 →
                    </Link>
                  </div>
                </li>
              );
            })}
            {rest > 0 && (
              <li className="text-[0.82rem] pt-1 leading-relaxed" style={{ color: "#5A4A3E" }}>
                외 {rest}곳 더 —{" "}
                <Link href="/muol/universities" className="underline underline-offset-4" style={{ color: "#0B5563" }}>
                  학과 명부에서 모두 보기
                </Link>
              </li>
            )}
          </ul>
        )}

        {q && matches.length === 0 && (
          <div
            className="mt-4 px-5 py-5"
            style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #D4CFC1" }}
          >
            <p
              className="text-[0.95rem] leading-relaxed mb-2"
              style={{ fontFamily: "var(--font-noto-sans-kr)", color: "#2B211C", fontWeight: 600, wordBreak: "keep-all" }}
            >
              「{query.trim()}」은(는) 아직 명부에 없습니다.
            </p>
            <p className="text-[0.85rem] mb-4" style={{ color: "#4A3B33", wordBreak: "keep-all", lineHeight: 1.85 }}>
              학교와 학과 이름을 알려 주시면 확인해서 명부에 더하겠습니다.
              <br />
              명부에 없는 학과·동아리·극단도{" "}
              <Link href="/muol/performer" className="underline underline-offset-4" style={{ color: "#0B5563", fontWeight: 600 }}>
                공연은 지금 바로 올리실 수 있습니다 →
              </Link>
            </p>
            <ContactLinks />
          </div>
        )}
      </div>

      {q && matches.length > 0 && (
        <p className="text-[0.82rem] mt-4" style={{ color: "#5A4A3E", wordBreak: "keep-all", lineHeight: 1.9 }}>
          찾는 학과가 없나요? <ContactLinks inline />
        </p>
      )}
    </div>
  );
}

/** 명부에 없을 때 알려 주는 세 갈래 — 인스타그램 DM · 카카오톡 채널 · 홈페이지 문의 */
function ContactLinks({ inline = false }: { inline?: boolean }) {
  const items = [
    { href: INSTAGRAM, label: "인스타그램 @syus_official", external: true },
    { href: KAKAO_CHANNEL, label: "카카오톡 채널", external: true },
    // 문의 폼은 ?type=register로 「공연 등록 문의」를 미리 골라 둔다(CONTACT_TYPE_PARAM)
    { href: "/muol/contact?type=register", label: "홈페이지 문의", external: false },
  ];

  if (inline) {
    return (
      <>
        {items.map((it, i) => (
          <span key={it.href}>
            {i > 0 && " · "}
            <a
              href={it.href}
              {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="underline underline-offset-4 whitespace-nowrap"
              style={{ color: "#0B5563" }}
            >
              {it.label}
            </a>
          </span>
        ))}
        로 알려 주세요.
      </>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((it) => (
        <a
          key={it.href}
          href={it.href}
          {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="inline-block px-4 py-2.5 text-[0.8rem] tracking-wide transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5563]"
          style={{ fontFamily: "var(--font-noto-sans-kr)", border: "1px solid #0B5563", color: "#0B5563", fontWeight: 600 }}
        >
          {it.label}
          {it.external ? " ↗" : " →"}
        </a>
      ))}
    </div>
  );
}
