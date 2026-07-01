"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * 연기 고민 QnA — 질문 상세 (/syus/qna/[id]).
 * 읽기 공개 / 답변·좋아요는 로그인. 질문 작성자는 답변을 '채택'할 수 있다.
 */

type Question = { id: string; user_id: string; title: string; body: string; tags: string[]; created_at: string };
type Answer = { id: string; user_id: string; body: string; is_accepted: boolean; created_at: string };

function fmt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function QnaDetailPage() {
  const params = useParams();
  const id = String(params.id);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [answerBody, setAnswerBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: me } = await supabase.auth.getUser();
    const uid = me.user?.id ?? null;
    setUserId(uid);

    const { data: q } = await supabase
      .from("syus_questions")
      .select("id, user_id, title, body, tags, created_at")
      .eq("id", id)
      .maybeSingle();

    if (!q) { setNotFound(true); setLoading(false); return; }
    setQuestion(q as Question);

    const { data: ans } = await supabase
      .from("syus_answers")
      .select("id, user_id, body, is_accepted, created_at")
      .eq("question_id", id)
      .order("is_accepted", { ascending: false })
      .order("created_at", { ascending: true });
    const answerList = (ans as Answer[] | null) ?? [];
    setAnswers(answerList);

    // 작성자 이름 맵
    const ids = Array.from(new Set([q.user_id, ...answerList.map((a) => a.user_id)]));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: { id: string; name: string | null }) => { map[p.id] = p.name || "익명"; });
      setNames(map);
    }

    // 좋아요(질문 대상)
    const { count } = await supabase
      .from("syus_likes")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "question")
      .eq("target_id", id);
    setLikeCount(count ?? 0);

    if (uid) {
      const { data: mine } = await supabase
        .from("syus_likes")
        .select("id")
        .eq("target_type", "question")
        .eq("target_id", id)
        .eq("user_id", uid)
        .maybeSingle();
      setLikedByMe(!!mine);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async () => {
    if (!userId) { window.location.href = `/auth/login?next=/syus/qna/${id}`; return; }
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    if (likedByMe) {
      await supabase.from("syus_likes").delete().eq("target_type", "question").eq("target_id", id).eq("user_id", userId);
      setLikedByMe(false); setLikeCount((c) => Math.max(0, c - 1));
    } else {
      const { error } = await supabase.from("syus_likes").insert({ user_id: userId, target_type: "question", target_id: id });
      if (!error) { setLikedByMe(true); setLikeCount((c) => c + 1); }
    }
    setBusy(false);
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { window.location.href = `/auth/login?next=/syus/qna/${id}`; return; }
    if (answerBody.trim().length < 1 || busy) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("syus_answers").insert({ question_id: id, user_id: userId, body: answerBody.trim() });
    if (!error) { setAnswerBody(""); await load(); }
    setBusy(false);
  };

  const acceptAnswer = async (answerId: string) => {
    if (!question || userId !== question.user_id || busy) return;
    setBusy(true);
    const supabase = createClient();
    // 기존 채택 해제 후 이 답변 채택(단일 채택)
    await supabase.from("syus_answers").update({ is_accepted: false }).eq("question_id", id);
    await supabase.from("syus_answers").update({ is_accepted: true }).eq("id", answerId);
    await load();
    setBusy(false);
  };

  if (loading) return <main className="qd-wrap"><p className="qd-loading">불러오는 중…</p><Style /></main>;

  if (notFound || !question) {
    return (
      <main className="qd-wrap">
        <p className="qd-loading">질문을 찾을 수 없습니다.</p>
        <Link href="/syus/thrust" className="qd-back" style={{ marginTop: "16px" }}>← 연기 고민 QnA</Link>
        <Style />
      </main>
    );
  }

  const isOwner = userId === question.user_id;

  return (
    <main className="qd-wrap">
      <Link href="/syus/thrust" className="qd-back">← 연기 고민 QnA</Link>

      <article className="qd-q">
        <h1 className="qd-q-title">{question.title}</h1>
        <p className="qd-q-meta">{names[question.user_id] ?? "익명"} · {fmt(question.created_at)}</p>
        <p className="qd-q-body">{question.body}</p>
        <div className="qd-q-foot">
          <div className="qd-tags">
            {question.tags?.map((t) => <span key={t} className="qd-tag">#{t}</span>)}
          </div>
          <button type="button" className={`qd-like ${likedByMe ? "is-on" : ""}`} onClick={toggleLike} disabled={busy}>
            {likedByMe ? "♥" : "♡"} 찜 {likeCount}
          </button>
        </div>
      </article>

      <section className="qd-answers">
        <h2 className="qd-h2">답변 {answers.length}</h2>
        {answers.length === 0 ? (
          <p className="qd-empty">아직 답변이 없어요. 먼저 겪어본 동료로서 한마디 건네주세요.</p>
        ) : (
          <ul className="qd-alist">
            {answers.map((a) => (
              <li key={a.id} className={`qd-a ${a.is_accepted ? "is-accepted" : ""}`}>
                {a.is_accepted && <span className="qd-accepted">채택된 답변</span>}
                <p className="qd-a-body">{a.body}</p>
                <div className="qd-a-foot">
                  <span className="qd-a-meta">{names[a.user_id] ?? "익명"} · {fmt(a.created_at)}</span>
                  {isOwner && !a.is_accepted && (
                    <button type="button" className="qd-accept-btn" onClick={() => acceptAnswer(a.id)} disabled={busy}>
                      이 답변 채택
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submitAnswer} className="qd-form">
        <label className="qd-label">답변 남기기</label>
        <textarea
          className="qd-textarea"
          value={answerBody}
          onChange={(e) => setAnswerBody(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder={userId ? "따뜻한 동료의 말투로, 경험을 나눠주세요." : "로그인 후 답변을 남길 수 있어요."}
        />
        <button type="submit" className="qd-submit" disabled={busy || answerBody.trim().length < 1}>
          {userId ? "답변 올리기" : "로그인하고 답변하기"}
        </button>
      </form>

      <Style />
    </main>
  );
}

function Style() {
  return (
    <style>{`
      .qd-wrap { max-width: 44rem; margin: 0 auto; padding: clamp(40px, 8vh, 88px) clamp(24px, 6vw, 48px) 120px; }
      .qd-loading { font-family: var(--font-noto-sans-kr); color: #6B5C50; }
      .qd-back { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.82rem; letter-spacing: 0.08em; color: #6B5C50; text-decoration: none; margin-bottom: 28px; }
      .qd-back:hover { color: #241C18; }
      .qd-q { background: #FFFFFF; border: 1px solid #E4DFD4; border-top: 3px solid var(--color-syus-stage-thrust); padding: 26px 26px 22px; margin-bottom: 40px; }
      .qd-q-title { font-family: var(--font-noto-serif-kr); font-size: clamp(1.5rem, 3.4vw, 2rem); font-weight: 700; color: #241C18; margin-bottom: 8px; word-break: keep-all; }
      .qd-q-meta { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #A79E90; margin-bottom: 18px; }
      .qd-q-body { font-family: var(--font-noto-sans-kr); font-size: 1rem; line-height: 1.85; font-weight: 300; color: #4A3B33; word-break: keep-all; white-space: pre-wrap; margin-bottom: 20px; }
      .qd-q-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
      .qd-tags { display: flex; gap: 8px; flex-wrap: wrap; }
      .qd-tag { font-family: var(--font-noto-sans-kr); font-size: 0.74rem; font-weight: 600; color: var(--color-syus-stage-thrust); border: 1px solid var(--color-syus-stage-thrust); border-radius: 100px; padding: 2px 10px; }
      .qd-like { appearance: none; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.85rem; font-weight: 600; color: #6B5C50; background: #F4F2ED; border: 1px solid #D4CFC1; padding: 7px 16px; border-radius: 100px; }
      .qd-like.is-on { color: #C0392B; border-color: #E4B4AD; background: #FBF1EF; }
      .qd-like:disabled { opacity: 0.6; cursor: default; }

      .qd-answers { margin-bottom: 40px; }
      .qd-h2 { font-family: var(--font-noto-serif-kr); font-size: 1.3rem; font-weight: 700; color: #241C18; margin-bottom: 18px; }
      .qd-empty { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; color: #6B5C50; background: #FFFFFF; border: 1px solid #E4DFD4; padding: 24px; }
      .qd-alist { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      .qd-a { background: #FFFFFF; border: 1px solid #E4DFD4; padding: 20px 22px; }
      .qd-a.is-accepted { border-color: var(--color-syus-stage-thrust); box-shadow: 0 0 0 1px var(--color-syus-stage-thrust) inset; }
      .qd-accepted { display: inline-block; font-family: var(--font-inter); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; color: #F4F2ED; background: var(--color-syus-stage-thrust); padding: 3px 10px; margin-bottom: 10px; }
      .qd-a-body { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.8; font-weight: 300; color: #4A3B33; word-break: keep-all; white-space: pre-wrap; margin-bottom: 14px; }
      .qd-a-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .qd-a-meta { font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #A79E90; }
      .qd-accept-btn { appearance: none; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.78rem; font-weight: 600; color: var(--color-syus-stage-thrust); background: none; border: 1px solid var(--color-syus-stage-thrust); padding: 5px 12px; }
      .qd-accept-btn:disabled { opacity: 0.6; cursor: default; }

      .qd-form { display: grid; gap: 12px; padding-top: 28px; border-top: 1px solid #E0DBD0; }
      .qd-label { font-family: var(--font-noto-sans-kr); font-size: 0.85rem; font-weight: 700; color: #241C18; }
      .qd-textarea { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.7; color: #241C18; background: #FFFFFF; border: 1px solid #D4CFC1; padding: 12px 14px; outline: none; resize: vertical; }
      .qd-textarea:focus { border-color: var(--color-syus-stage-thrust); }
      .qd-submit { justify-self: start; appearance: none; cursor: pointer; font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #F4F2ED; background: var(--color-syus-stage-thrust); border: 0; padding: 12px 26px; }
      .qd-submit:disabled { opacity: 0.55; cursor: not-allowed; }
    `}</style>
  );
}
