import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 창작 독백 생성 백엔드 (가이드북 §6.3 — B안 큐 기반)
 *
 * 흐름: 요청 폼이 syus_monologues에 status='pending'으로 저장 → 이 라우트를 호출
 *   → Anthropic API로 "원본(창작) 독백" 생성 → status='reviewing'로 전환(검수 대기)
 *   → 운영자가 /syus/monologues/review 에서 승인(delivered) / 반려(rejected).
 *
 * 보안·방어 (§6.3):
 * - API 키는 서버측 .env(ANTHROPIC_API_KEY)만. 이 라우트에서만 사용, 클라이언트 노출 금지.
 * - 로그인 게이트 + 요청자 본인(또는 운영자) 검증.
 * - 사용량 캡(유저/일 3건)은 DB 함수 syus_start_generation() 으로 '원자적'으로 처리
 *   (advisory lock 안에서 카운트+claim → TOCTOU 동시요청 우회 차단, 2026-07-02 보안 점검).
 *   함수가 아직 없으면 레거시 비원자 경로로 폴백(운영 안전).
 * - generated_text 기록은 RLS상 운영자 전용이므로 service role로만 갱신.
 *
 * Body: { id: string }  — 생성 대상 syus_monologues.id
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";
const DAILY_CAP = 3; // 유저/일 생성 한도 (운영자 예외). SQL 함수와 값 일치.

const SYSTEM_PROMPT = [
  "당신은 한국어 무대 독백을 창작하는 극작가입니다.",
  "반드시 완전히 새로운 '원본' 독백만 씁니다.",
  "기존 희곡·영화·드라마·소설·시·가사 등 어떤 저작물도 복제하거나 각색하지 않습니다. 실제 작품의 제목·인물명·유명 대사를 인용하지 않습니다.",
  "자연스럽고 말맛이 살아 있는 한국어 무대 화술로, 실제 배우가 소리 내어 연기할 수 있게 씁니다.",
  "지문·해설·머리말·따옴표 없이 독백 '대사 본문'만 출력합니다.",
].join(" ");

function buildUserPrompt(m: {
  char_type: string | null; emotion: string | null; length_spec: string | null;
  tone: string | null; purpose: string | null; gender: string | null; age_range: string | null;
}) {
  const lines = [
    "아래 조건에 맞는 새 창작 독백 한 편을 써 주세요.",
    "",
    m.char_type ? `- 인물 유형: ${m.char_type}` : "",
    m.emotion ? `- 감정·상황: ${m.emotion}` : "",
    m.length_spec ? `- 길이: ${m.length_spec}` : "- 길이: 40초 내외 (8~10문장)",
    m.tone ? `- 톤·장르: ${m.tone}` : "",
    m.purpose ? `- 용도: ${m.purpose}` : "",
    m.gender ? `- 성별: ${m.gender}` : "",
    m.age_range ? `- 연령대: ${m.age_range}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );

  // 1) 로그인 게이트
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 페이로드
  let id: string;
  try {
    const body = await req.json();
    id = body.id;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "요청 id가 누락되었습니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // 3) service role 클라이언트 (필드 조회·검수전환 — RLS 우회)
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    console.error("[monologue/generate] admin client 생성 실패", e);
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  // 4) 원자적 클레임 + 사용량 캡 (DB 함수). 없으면 레거시 비원자 검사로 폴백.
  let claimedByRpc = false;
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("syus_start_generation", { p_id: id });
  if (!rpcErr) {
    switch (rpcRes) {
      case "ok": claimedByRpc = true; break;
      case "ratelimited":
        return NextResponse.json({ error: `하루 독백 요청은 ${DAILY_CAP}건까지예요. 내일 다시 청해 주세요.` }, { status: 429 });
      case "forbidden":
        return NextResponse.json({ error: "본인 요청만 생성할 수 있습니다." }, { status: 403 });
      case "already":
        return NextResponse.json({ error: "이미 처리 중이거나 생성된 요청입니다." }, { status: 409 });
      case "notfound":
        return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
      case "unauthorized":
        return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
      default:
        return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
    }
  }

  // 4-b) 레거시 폴백(함수 미적용 환경) — 비원자 검사(추후 SQL 적용 시 이 경로는 안 탐)
  if (!claimedByRpc) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = prof?.role === "admin";
    const { data: chk } = await supabase
      .from("syus_monologues").select("user_id, status, generated_text").eq("id", id).maybeSingle();
    if (!chk) return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    if (!isAdmin) {
      if (chk.user_id !== user.id) return NextResponse.json({ error: "본인 요청만 생성할 수 있습니다." }, { status: 403 });
      if (chk.status !== "pending" || chk.generated_text) return NextResponse.json({ error: "이미 처리 중이거나 생성된 요청입니다." }, { status: 409 });
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("syus_monologues").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", since);
      if ((count ?? 0) > DAILY_CAP) {
        return NextResponse.json({ error: `하루 독백 요청은 ${DAILY_CAP}건까지예요. 내일 다시 청해 주세요.` }, { status: 429 });
      }
    }
  }

  // 실패 시 되돌리기: RPC 경로에선 이미 reviewing 으로 claim 했으므로 pending 으로 복구.
  const revert = async () => {
    if (claimedByRpc) {
      await admin.from("syus_monologues").update({ status: "pending" }).eq("id", id);
    }
  };

  // 5) 대상 행 필드 조회 (프롬프트용) — service role
  const { data: row } = await admin
    .from("syus_monologues")
    .select("char_type, emotion, length_spec, tone, purpose, gender, age_range")
    .eq("id", id)
    .maybeSingle();
  if (!row) { await revert(); return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 }); }

  // 6) API 키 (서버측 .env만)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await revert();
    return NextResponse.json({ error: "생성 기능이 아직 준비 중입니다. (서버 API 키 미설정)" }, { status: 503 });
  }

  // 7) Anthropic Messages API 호출 — 원본 창작 독백 생성
  let generated = "";
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(row) }],
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("[monologue/generate] Anthropic 오류", resp.status, detail.slice(0, 500));
      await revert();
      return NextResponse.json({ error: "독백 생성에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const data = await resp.json();
    if (data?.stop_reason === "refusal") {
      await revert();
      return NextResponse.json(
        { error: "이 조건으로는 독백을 지을 수 없어요. 인물·상황을 조금 바꿔 다시 청해 주세요." },
        { status: 422 }
      );
    }
    generated = (data?.content?.[0]?.text ?? "").trim();
    if (!generated) {
      console.error("[monologue/generate] 빈 응답", JSON.stringify(data).slice(0, 500));
      await revert();
      return NextResponse.json({ error: "독백 생성 결과가 비어 있어요. 다시 시도해 주세요." }, { status: 502 });
    }
  } catch (e) {
    console.error("[monologue/generate] fetch 예외", e);
    await revert();
    return NextResponse.json({ error: "독백 생성 중 오류가 발생했어요." }, { status: 502 });
  }

  // 8) 검수 대기로 확정 (RLS update = 운영자 전용 → service role). status는 이미 reviewing(RPC) 또는 여기서 전환(레거시).
  const { error: upErr } = await admin
    .from("syus_monologues")
    .update({ generated_text: generated, status: "reviewing" })
    .eq("id", id);
  if (upErr) {
    console.error("[monologue/generate] update 실패", upErr.message);
    await revert();
    return NextResponse.json({ error: "생성본 저장에 실패했어요." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "reviewing" });
}
