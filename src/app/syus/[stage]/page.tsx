import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

/**
 * 시우스 무대 섹션 상세페이지 (/syus/[stage]) — 2026-07-01 커뮤니티 상세 구성 초안.
 * 가이드북(구축가이드북.md §4.4) 반영: 6섹션 전체 오픈, 각 섹션의 기능·무대 은유에 맞춘
 * 커뮤니티형 랜딩(무대 소개 + 이곳에서 할 수 있는 것 + 시드/예시 콘텐츠 + 쓰기 로그인 게이트 + 다리).
 * '시우스 = 연기 커뮤니티' 강조. 실제 글쓰기·DB·독백 생성 백엔드는 다음 차수(현재는 읽기 구성·시드 노출).
 * 쓰기 액션은 로그인 게이트(/auth/login)로 연결(읽기 공개 / 쓰기 로그인).
 */

type QnaSeed = { q: string; a: string; tags: string[] };
type EssayCard = { title: string; excerpt: string; meta: string };
type PostCard = { title: string; cat: string; meta: string };
type ReviewCard = { work: string; stars: number; excerpt: string; source: string };
type BookCard = { title: string; author: string; stars: number; topic: string; note: string };

type Stage = {
  name: string;
  section: string;
  color: string;
  tagline: string;
  stageMeta: string; // 무대 은유 소개
  lead: string; // 커뮤니티 프레이밍
  can: string[]; // 이곳에서 할 수 있는 것
  cta: string; // 쓰기 액션 라벨
  guideline: string;
  kind: "essay" | "qna" | "free" | "review" | "monologue" | "book";
  essays?: EssayCard[];
  qnas?: QnaSeed[];
  posts?: PostCard[];
  cats?: string[];
  reviews?: ReviewCard[];
  books?: BookCard[];
  monoFields?: { label: string; sample: string }[];
  monoSample?: { title: string; body: string };
};

const STAGES: Record<string, Stage> = {
  proscenium: {
    name: "프로시니엄 무대",
    section: "주인장 견해글",
    color: "var(--color-syus-stage-proscenium)",
    tagline: "액자 너머, 정면으로 마주하는 정제된 시선",
    stageMeta: "프로시니엄은 액자(額子) 너머로 무대를 정면에서 보여주는, 가장 격식 있는 형태입니다. 정제된 한 편을 관객 앞에 반듯이 내거는 자리.",
    lead: "운영자가 연기를 오래 들여다본 글을 한 편씩 액자에 걸듯 내겁니다. 혼자 쓰는 글이 아니라, 읽고 되묻는 사람들과 함께 완성되는 견해입니다.",
    can: ["운영자의 ‘연기의 냉장고’ 에세이를 읽습니다", "글 아래에 생각을 덧대는 댓글을 남깁니다 (로그인)", "‘질문 받기’에 궁금한 연기 이야기를 넣어두면, 운영자가 골라 다음 글로 답합니다"],
    cta: "질문 남기기",
    guideline: "실명 비판보다 장면과 연기 자체를 이야기합니다. 사실과 의견을 구분해 적습니다.",
    kind: "essay",
    essays: [
      { title: "냉장고에 재워둔 침묵 — 대사 없는 3초에 대하여", excerpt: "가장 좋은 연기는 말이 멈춘 자리에서 자주 일어난다. 대사와 대사 사이, 배우가 무엇을 참고 있는지가 보일 때…", meta: "연기의 냉장고 · 01" },
      { title: "울지 않는 슬픔이 더 젖는 이유", excerpt: "눈물을 보여주려는 연기는 관객을 밀어낸다. 참아내는 몸이 오히려 객석을 끌어당기는 장면들을 모아 두었다…", meta: "연기의 냉장고 · 02" },
      { title: "‘잘하는 연기’와 ‘믿기는 연기’ 사이", excerpt: "기술은 감탄을 부르고 진심은 믿음을 부른다. 둘은 적이 아니지만, 무대에서 우리가 오래 기억하는 쪽은…", meta: "연기의 냉장고 · 03" },
    ],
  },
  thrust: {
    name: "돌출 무대",
    section: "연기 고민 QnA",
    color: "var(--color-syus-stage-thrust)",
    tagline: "객석 속으로 뻗어, 가장 가까이 주고받는 대화",
    stageMeta: "돌출무대는 객석 한가운데로 걸어 나와 삼면이 관객으로 둘러싸이는 무대입니다. 가장 친밀하게 서로의 숨이 닿는 자리.",
    lead: "연기 고민을 혼자 삼키지 않고 꺼내 두면, 먼저 겪은 동료와 운영자가 함께 답을 더듬습니다. 시우스에서 가장 가까운 코너입니다.",
    can: ["연기 고민을 질문으로 올립니다 (로그인)", "다른 사람의 질문에 내 경험으로 답하고, 좋은 답을 채택합니다", "발성·신체·오디션·심리 등 태그로 비슷한 고민을 찾아 읽습니다"],
    cta: "질문 올리기",
    guideline: "정답을 강요하지 않고 각자의 경험으로 돕습니다. 위계 없이, 따뜻한 동료의 말투로.",
    kind: "qna",
    qnas: [
      { q: "무대에서 대사를 잊을까 봐 불안해서 오히려 더 떨려요.", a: "대사를 ‘암기한 정보’가 아니라 ‘상대에게 건네는 말’로 바꾸면 불안이 줄어요. 상대 배우의 말에 진짜로 반응하려 하면 다음 대사는 상황에서 따라옵니다. 잊는 순간을 없애려 하기보다, 잊어도 흐름이 끊기지 않게 상대와 연결돼 있는 게 안전망입니다.", tags: ["심리", "대본"] },
      { q: "발성이 약하다는 피드백을 자주 받아요.", a: "발성은 ‘크게 지르기’가 아니라 ‘몸으로 받치기’예요. 누운 자세로 배가 오르내리는 호흡을 먼저 익히고, 그 호흡 위에 소리를 얹어 보세요. 매일 5분 긴 모음 연습이 두 달이면 체감됩니다. 무리해서 짜내는 큰 소리는 오히려 발성을 망칩니다.", tags: ["발성", "호흡"] },
      { q: "오디션만 가면 너무 긴장해서 평소 실력이 안 나와요.", a: "심사위원을 평가자가 아니라 ‘내 장면의 상대’로 바꿔 생각하면 시선이 장면 안으로 모입니다. 들어가기 전 길고 느린 날숨을 몇 번 쉬고, 첫 한 줄에서 ‘하려는 것’ 하나에만 집중하세요. 완벽 대신 ‘진심으로 한 번 해본다’를 목표로.", tags: ["오디션", "심리"] },
      { q: "상대 배우와 호흡(합)이 안 맞을 때 어떻게 하나요?", a: "합은 ‘맞추는’ 게 아니라 ‘듣는’ 데서 와요. 내 연기를 계획대로 끌고 가려 하면 어긋나지만, 상대가 오늘 주는 것에 진짜로 반응하면 매번 살아 있는 장면이 됩니다. 대사 없이 눈을 보고 반응만 주고받는 연습을 권해요.", tags: ["앙상블", "연습"] },
    ],
  },
  arena: {
    name: "원형 무대",
    section: "자유 커뮤니티",
    color: "var(--color-syus-stage-arena)",
    tagline: "사방이 객석인, 중심 없이 둘러앉은 광장",
    stageMeta: "원형무대는 사방이 객석이라 위계가 없습니다. 누구도 뒤가 아니고, 모두가 서로를 마주 보는 360°의 자리.",
    lead: "연기에 관한 이야기라면 무엇이든 자유롭게 오가는 광장입니다. 잡담도, 소식도, 함께할 사람을 찾는 일도 여기서.",
    can: ["연기·무대에 관한 자유로운 글을 올립니다 (로그인)", "연습·스터디·프로젝트 함께할 동료를 모읍니다", "인기·최신으로 정렬해 지금 오가는 이야기를 봅니다"],
    cta: "글 올리기",
    guideline: "홍보·비방·개인정보 노출은 삼갑니다. 광장은 서로가 지킬 때 광장으로 남습니다.",
    kind: "free",
    cats: ["잡담", "소식", "모집", "연습후기", "질문"],
    posts: [
      { title: "이번 주말 대본 리딩 같이 하실 분 (2명)", cat: "모집", meta: "댓글 6 · 방금" },
      { title: "졸업 공연 끝났습니다. 무대가 벌써 그립네요", cat: "잡담", meta: "댓글 12 · 3시간 전" },
      { title: "지역 소극장 워크숍 정보 공유해요", cat: "소식", meta: "댓글 4 · 어제" },
    ],
  },
  blackbox: {
    name: "블랙박스",
    section: "관람의 잔상",
    color: "var(--color-syus-stage-blackbox)",
    tagline: "암전 뒤에 남는 인상 — 무엇이든 될 수 있는 빈 상자",
    stageMeta: "블랙박스는 아무 장치도 없는 빈 검은 상자입니다. 무엇이든 될 수 있기에, 무대가 꺼진 뒤 마음에 남은 잔상을 빚기에 알맞은 자리.",
    lead: "공연·영화·드라마를 보고 남은 잔상을 서로 나눕니다. 같은 작품을 본 사람들의 다른 잔상이 포개질 때, 혼자 본 것보다 오래 남습니다.",
    can: ["본 작품의 감상을 별점과 함께 남깁니다 (로그인)", "작품명·태그로 다른 사람의 잔상을 찾아 읽습니다", "포스터·스틸을 올릴 땐 반드시 출처를 함께 적습니다"],
    cta: "후기 남기기",
    guideline: "이미지·영상은 출처 입력이 필수입니다. 출처 표기가 권리 허락은 아니므로, 정당한 비평·인용 범위에서만. 신고 시 즉시 내립니다.",
    kind: "review",
    reviews: [
      { work: "연극 「갈매기」", stars: 5, excerpt: "니나가 마지막에 웃으며 나가던 뒷모습이 며칠째 남는다. 무너지지 않으려 애쓰는 사람의 등이 그렇게 크게 보일 줄이야.", source: "안톤 체호프 원작 / ○○극단" },
      { work: "영화 「버드맨」", stars: 4, excerpt: "배우가 배우를 연기하는 층이 겹칠수록, 무대 뒤의 불안이 더 진짜처럼 다가왔다.", source: "감독 알레한드로 G. 이냐리투" },
      { work: "드라마 「나의 아저씨」", stars: 5, excerpt: "대사보다 말줄임에 더 많은 게 담겨 있었다. 참는 연기가 어디까지 갈 수 있는지 보여준 장면들.", source: "tvN 방영작" },
    ],
  },
  flex: {
    name: "변형 무대",
    section: "창작 독백 아카이브",
    color: "var(--color-syus-stage-flex)",
    tagline: "형태가 계속 바뀌는, 끝없이 새로 지어지는 무대",
    stageMeta: "변형무대는 필요에 따라 형태가 바뀌는 가변 무대입니다. 요청마다 새로운 독백이 지어지는 이 서고와 꼭 맞물립니다.",
    lead: "원하는 결의 독백을 요청하면, AI가 기존 작품을 베끼지 않은 창작 독백을 지어 전달합니다. 운영자의 검수를 거쳐 건네지고, 동의하면 서고에 쌓여 다른 사람도 둘러봅니다.",
    can: ["인물·감정·길이·톤을 골라 독백을 요청합니다 (로그인)", "받은 독백을 연습·오디션에 자유롭게 씁니다", "공개에 동의한 독백들이 쌓인 서고를 함께 둘러봅니다"],
    cta: "독백 요청하기",
    guideline: "모든 독백은 AI가 지은 창작 원본입니다. 운영자 검수 뒤 전달되며(컨시어지 방식), 기존 작품 복제는 프롬프트·검수로 차단합니다.",
    kind: "monologue",
    monoFields: [
      { label: "인물 유형", sample: "20대 후반, 오래 준비한 무대를 포기하려는 사람" },
      { label: "감정·상황", sample: "체념과 미련 사이, 마지막으로 무대를 돌아보며" },
      { label: "길이", sample: "40초 내외 (8~10문장)" },
      { label: "톤·용도", sample: "담담한 현대 구어체 / 오디션용" },
    ],
    monoSample: {
      title: "예시 · 「마지막 리허설」",
      body: "불 꺼진 객석을 보면 아직도 심장이 뛰어. 웃기지. 아무도 없는데. …나는 이 자리가 나를 안 불러줄까 봐 오래 무서웠어. 그런데 오늘 알았어. 무대가 나를 부르는 게 아니라, 내가 계속 여기로 걸어 들어온 거였구나. 그러니까 이건 포기가 아니라… 한 번 더, 제대로 인사하는 거야.",
    },
  },
  corridor: {
    name: "사잇 무대",
    section: "책 서재",
    color: "var(--color-syus-stage-corridor)",
    tagline: "관문이자 문지방 — 지식으로 들어가는 아치",
    stageMeta: "사잇 무대(아치)는 안과 밖을 잇는 문지방입니다. 무대 밖에서 무대를 기르는 책들이 놓이는, 지식으로 향하는 통로.",
    lead: "연기와 무대 곁에 둘 책을 함께 모읍니다. 한 사람의 추천이 다른 사람의 다음 한 권이 되는, 천천히 자라는 서가입니다.",
    can: ["읽은 연기·무대 책을 별점·후기와 함께 등록합니다 (로그인)", "발성·신체·이론·전기 등 주제로 책을 찾습니다", "다른 사람의 후기를 보고 다음 한 권을 고릅니다"],
    cta: "책 등록하기",
    guideline: "인용은 출처와 함께, 짧게. 책의 내용을 옮기기보다 곁에 두고 싶은 이유를 적습니다.",
    kind: "book",
    books: [
      { title: "배우 수업 (An Actor Prepares)", author: "콘스탄틴 스타니슬랍스키", stars: 5, topic: "이론", note: "‘만약에’ 하나로 장면이 어떻게 살아나는지. 처음 한 권으로 자주 권해지는 고전." },
      { title: "빈 공간 (The Empty Space)", author: "피터 브룩", stars: 5, topic: "연출·이론", note: "아무것도 없는 공간이 어떻게 무대가 되는가. 블랙박스를 사랑하게 되는 책." },
      { title: "배우와 표적 (The Actor and the Target)", author: "디클런 도넬란", stars: 4, topic: "신체·심리", note: "‘느끼려 하지 말고 보라’. 긴장으로 굳은 몸에 길을 터주는 실용적인 문장들." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(STAGES).map((stage) => ({ stage }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stage: string }>;
}): Promise<Metadata> {
  const { stage } = await params;
  const info = STAGES[stage];
  if (!info) return { title: "시우스" };
  return {
    title: `${info.section} · ${info.name}`,
    description: `${info.lead} 시우스는 연기 커뮤니티입니다.`,
    alternates: { canonical: `https://syus.co.kr/syus/${stage}` },
  };
}

function Stars({ n, color }: { n: number; color: string }) {
  return (
    <span aria-label={`별점 ${n}점`} style={{ color, letterSpacing: "1px", fontSize: "0.9rem" }}>
      {"★".repeat(n)}
      <span style={{ color: "#D8D1C4" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stage: string }>;
}) {
  const { stage } = await params;
  const info = STAGES[stage];
  if (!info) notFound();

  return (
    <main className="syd-wrap">
      <Link href="/syus" className="syd-back">← 여섯 무대로</Link>

      <span className="syd-badge" style={{ background: info.color }}>지금 열림 · 연기 커뮤니티</span>
      <h1 className="syd-title">{info.section}</h1>
      <p className="syd-tagline" style={{ color: info.color }}>{info.name} · {info.tagline}</p>

      <p className="syd-lead">{info.lead}</p>

      {/* 무대 소개 */}
      <section className="syd-stagemeta" style={{ borderLeftColor: info.color }}>
        <span className="syd-stagemeta-h">이 무대에 대하여</span>
        <p>{info.stageMeta}</p>
      </section>

      {/* 이곳에서 할 수 있는 것 */}
      <section className="syd-block">
        <h2 className="syd-h2">이곳에서 함께 할 수 있는 것</h2>
        <ul className="syd-can">
          {info.can.map((c) => (
            <li key={c}><span style={{ color: info.color }}>·</span>{c}</li>
          ))}
        </ul>
      </section>

      {/* 섹션별 시드/예시 콘텐츠 */}
      {info.kind === "essay" && info.essays && (
        <section className="syd-block">
          <h2 className="syd-h2">지금 걸린 글</h2>
          <div className="syd-cards">
            {info.essays.map((e) => (
              <article key={e.title} className="syd-card" style={{ borderTopColor: info.color }}>
                <span className="syd-card-meta" style={{ color: info.color }}>{e.meta}</span>
                <h3 className="syd-card-title">{e.title}</h3>
                <p className="syd-card-body">{e.excerpt}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {info.kind === "qna" && info.qnas && (
        <section className="syd-block">
          <h2 className="syd-h2">먼저 오간 고민들</h2>
          <div className="syd-qlist">
            {info.qnas.map((qa) => (
              <article key={qa.q} className="syd-q">
                <p className="syd-q-q"><span style={{ color: info.color }}>Q.</span> {qa.q}</p>
                <p className="syd-q-a">{qa.a}</p>
                <div className="syd-tags">
                  {qa.tags.map((t) => (
                    <span key={t} className="syd-tag" style={{ borderColor: info.color, color: info.color }}>#{t}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {info.kind === "free" && info.posts && (
        <section className="syd-block">
          <h2 className="syd-h2">광장에 오가는 이야기</h2>
          {info.cats && (
            <div className="syd-tags" style={{ marginBottom: "16px" }}>
              {info.cats.map((c) => (
                <span key={c} className="syd-chip">{c}</span>
              ))}
            </div>
          )}
          <ul className="syd-feed">
            {info.posts.map((p) => (
              <li key={p.title} className="syd-feed-item">
                <span className="syd-feed-cat" style={{ color: info.color }}>{p.cat}</span>
                <span className="syd-feed-title">{p.title}</span>
                <span className="syd-feed-meta">{p.meta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {info.kind === "review" && info.reviews && (
        <section className="syd-block">
          <h2 className="syd-h2">남겨진 잔상</h2>
          <div className="syd-cards">
            {info.reviews.map((r) => (
              <article key={r.work} className="syd-card" style={{ borderTopColor: info.color }}>
                <div className="syd-review-top">
                  <h3 className="syd-card-title" style={{ margin: 0 }}>{r.work}</h3>
                  <Stars n={r.stars} color={info.color} />
                </div>
                <p className="syd-card-body">{r.excerpt}</p>
                <span className="syd-source">출처 · {r.source}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {info.kind === "monologue" && info.monoFields && info.monoSample && (
        <section className="syd-block">
          <h2 className="syd-h2">독백 요청은 이렇게</h2>
          <div className="syd-form">
            {info.monoFields.map((f) => (
              <div key={f.label} className="syd-field">
                <span className="syd-field-label">{f.label}</span>
                <span className="syd-field-sample">{f.sample}</span>
              </div>
            ))}
          </div>
          <article className="syd-card" style={{ borderTopColor: info.color, marginTop: "20px" }}>
            <span className="syd-card-meta" style={{ color: info.color }}>AI 창작 원본 · 운영자 검수본</span>
            <h3 className="syd-card-title">{info.monoSample.title}</h3>
            <p className="syd-card-body" style={{ fontStyle: "normal", lineHeight: 1.9 }}>{info.monoSample.body}</p>
          </article>
        </section>
      )}

      {info.kind === "book" && info.books && (
        <section className="syd-block">
          <h2 className="syd-h2">서가에 놓인 책</h2>
          <div className="syd-cards">
            {info.books.map((b) => (
              <article key={b.title} className="syd-card" style={{ borderTopColor: info.color }}>
                <div className="syd-review-top">
                  <span className="syd-tag" style={{ borderColor: info.color, color: info.color }}>{b.topic}</span>
                  <Stars n={b.stars} color={info.color} />
                </div>
                <h3 className="syd-card-title">{b.title}</h3>
                <span className="syd-card-meta" style={{ color: "#6B5C50" }}>{b.author}</span>
                <p className="syd-card-body">{b.note}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 쓰기 로그인 게이트 CTA */}
      <section className="syd-cta" style={{ borderColor: info.color }}>
        <p className="syd-cta-text">
          읽는 건 누구나, 쓰는 건 로그인한 뒤에. <br />
          시우스는 함께 채워가는 연기 커뮤니티입니다.
        </p>
        <Link href="/auth/login" className="syd-cta-btn" style={{ background: info.color }}>
          로그인하고 {info.cta} →
        </Link>
        <p className="syd-guide">{info.guideline}</p>
        <p className="syd-soon">아직 문을 여는 중입니다. 위 예시는 이 자리에 곧 쌓일 글의 결을 보여드리는 시드입니다.</p>
      </section>

      {/* 다리 */}
      <nav className="syd-bridge">
        <Link href="/syus" className="syd-bridge-link">← 다른 무대 둘러보기</Link>
        <Link href="/syus/about" className="syd-bridge-link">시우스란 →</Link>
        <Link href="/muol" className="syd-bridge-link syd-bridge-muted">무대올림으로</Link>
      </nav>

      <style>{`
        .syd-wrap {
          max-width: 46rem;
          margin: 0 auto;
          padding: clamp(40px, 8vh, 88px) clamp(24px, 6vw, 48px) 120px;
        }
        .syd-back {
          display: inline-block;
          font-family: var(--font-noto-sans-kr);
          font-size: 0.82rem; letter-spacing: 0.08em;
          color: #6B5C50; text-decoration: none; margin-bottom: 32px;
        }
        .syd-back:hover { color: #241C18; }
        .syd-badge {
          display: inline-block;
          font-family: var(--font-inter);
          font-size: 0.66rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600;
          color: #F4F2ED; padding: 6px 14px; margin-bottom: 20px;
        }
        .syd-title {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(2rem, 5vw, 3rem); font-weight: 700; letter-spacing: -0.02em;
          color: #241C18; margin-bottom: 10px; word-break: keep-all;
        }
        .syd-tagline {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem; font-weight: 600; margin-bottom: 28px; word-break: keep-all;
        }
        .syd-lead {
          font-family: var(--font-noto-serif-kr);
          font-size: clamp(1.15rem, 2.4vw, 1.45rem); line-height: 1.7; font-weight: 400;
          color: #241C18; word-break: keep-all;
          margin-bottom: 36px; padding-bottom: 36px; border-bottom: 1px solid #E0DBD0;
        }
        .syd-stagemeta {
          background: #FFFFFF; border: 1px solid #E4DFD4; border-left: 3px solid;
          padding: 20px 22px; margin-bottom: 40px;
        }
        .syd-stagemeta-h {
          display: block; font-family: var(--font-inter);
          font-size: 0.64rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 600;
          color: #A79E90; margin-bottom: 8px;
        }
        .syd-stagemeta p {
          font-family: var(--font-noto-sans-kr);
          font-size: 0.95rem; line-height: 1.75; font-weight: 300; color: #4A3B33; word-break: keep-all;
        }
        .syd-block { margin-bottom: 44px; }
        .syd-h2 {
          font-family: var(--font-noto-serif-kr);
          font-size: 1.35rem; font-weight: 700; color: #241C18; margin-bottom: 18px;
        }
        .syd-can { list-style: none; margin: 0; padding: 0; }
        .syd-can li {
          font-family: var(--font-noto-sans-kr);
          font-size: 1rem; line-height: 1.7; font-weight: 300; color: #4A3B33;
          padding-left: 20px; position: relative; margin-bottom: 12px; word-break: keep-all;
        }
        .syd-can li span { position: absolute; left: 0; font-weight: 700; }

        .syd-cards { display: grid; gap: 16px; }
        .syd-card {
          background: #FFFFFF; border: 1px solid #E4DFD4; border-top: 3px solid;
          padding: 22px 24px; box-shadow: 0 2px 10px rgba(36,28,24,0.04);
        }
        .syd-card-meta { font-family: var(--font-inter); font-size: 0.72rem; letter-spacing: 0.08em; font-weight: 600; display: block; margin-bottom: 8px; }
        .syd-card-title { font-family: var(--font-noto-serif-kr); font-size: 1.15rem; font-weight: 700; color: #241C18; margin-bottom: 8px; word-break: keep-all; }
        .syd-card-body { font-family: var(--font-noto-sans-kr); font-size: 0.95rem; line-height: 1.75; font-weight: 300; color: #6B5C50; word-break: keep-all; }
        .syd-review-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
        .syd-source { display: block; margin-top: 12px; font-family: var(--font-noto-sans-kr); font-size: 0.78rem; color: #A79E90; }

        .syd-qlist { display: grid; gap: 14px; }
        .syd-q { background: #FFFFFF; border: 1px solid #E4DFD4; padding: 20px 22px; }
        .syd-q-q { font-family: var(--font-noto-sans-kr); font-size: 1rem; font-weight: 700; color: #241C18; margin-bottom: 10px; word-break: keep-all; }
        .syd-q-q span { font-weight: 800; margin-right: 4px; }
        .syd-q-a { font-family: var(--font-noto-sans-kr); font-size: 0.93rem; line-height: 1.75; font-weight: 300; color: #6B5C50; word-break: keep-all; margin-bottom: 12px; }

        .syd-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .syd-tag { font-family: var(--font-noto-sans-kr); font-size: 0.72rem; font-weight: 600; border: 1px solid; border-radius: 100px; padding: 3px 11px; }
        .syd-chip { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #6B5C50; background: #FFFFFF; border: 1px solid #E4DFD4; border-radius: 100px; padding: 5px 14px; }

        .syd-feed { list-style: none; margin: 0; padding: 0; border-top: 1px solid #E0DBD0; }
        .syd-feed-item { display: flex; align-items: center; gap: 12px; padding: 15px 4px; border-bottom: 1px solid #E0DBD0; }
        .syd-feed-cat { flex: 0 0 auto; font-family: var(--font-noto-sans-kr); font-size: 0.75rem; font-weight: 700; width: 52px; }
        .syd-feed-title { flex: 1 1 auto; font-family: var(--font-noto-sans-kr); font-size: 0.95rem; color: #241C18; word-break: keep-all; }
        .syd-feed-meta { flex: 0 0 auto; font-family: var(--font-noto-sans-kr); font-size: 0.75rem; color: #A79E90; white-space: nowrap; }

        .syd-form { display: grid; gap: 10px; }
        .syd-field { display: flex; gap: 14px; background: #FFFFFF; border: 1px solid #E4DFD4; padding: 14px 18px; align-items: baseline; }
        .syd-field-label { flex: 0 0 88px; font-family: var(--font-noto-sans-kr); font-size: 0.82rem; font-weight: 700; color: #241C18; }
        .syd-field-sample { font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 300; color: #6B5C50; word-break: keep-all; }

        .syd-cta { margin-top: 8px; padding: 32px 28px; background: #FFFFFF; border: 1px solid; text-align: center; }
        .syd-cta-text { font-family: var(--font-noto-serif-kr); font-size: 1.1rem; line-height: 1.6; color: #241C18; margin-bottom: 20px; word-break: keep-all; }
        .syd-cta-btn { display: inline-block; font-family: var(--font-noto-sans-kr); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.04em; color: #F4F2ED; text-decoration: none; padding: 13px 30px; }
        .syd-cta-btn:hover { opacity: 0.92; }
        .syd-guide { font-family: var(--font-noto-sans-kr); font-size: 0.82rem; line-height: 1.65; font-weight: 300; color: #8A7D6E; margin-top: 22px; word-break: keep-all; }
        .syd-soon { font-family: var(--font-noto-sans-kr); font-size: 0.8rem; color: #A79E90; margin-top: 10px; word-break: keep-all; }

        .syd-bridge { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 48px; padding-top: 28px; border-top: 1px solid #E0DBD0; }
        .syd-bridge-link { font-family: var(--font-noto-sans-kr); font-size: 0.88rem; font-weight: 600; color: #241C18; text-decoration: none; border-bottom: 1px solid #241C18; padding-bottom: 3px; }
        .syd-bridge-link.syd-bridge-muted { color: #6B5C50; border-bottom-color: #E0DBD0; font-weight: 500; }
        .syd-bridge-link:hover { opacity: 0.7; }
      `}</style>
    </main>
  );
}
