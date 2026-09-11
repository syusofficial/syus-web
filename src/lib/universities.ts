/**
 * 한국 대학 무대예술 학과 명부 — 단일 원본
 *
 * 생성: 2026-09-10 · 원본 `Content_Report/data/universities.md`에서 기계 변환.
 * 손으로 고치지 말고 원본을 고친 뒤 다시 변환할 것(원본이 대외 수치의 정본이다).
 *
 * 【왜 코드 상수인가】
 * Supabase 테이블이 아니라 상수로 둔 이유는 셋이다.
 *   · 사장님이 SQL을 실행할 일이 없다 (계정·키·마이그레이션 부담 0)
 *   · 수정 이력이 git에 남는다
 *   · 빌드 시점에 정적으로 굳어 매 요청 조회가 없다
 * 학과 목록은 한 해에 몇 번 바뀌지 않는다. 운영 중 자주 고쳐야 할 만큼 커지면 그때 테이블로 옮긴다.
 *
 * 【url 필드는 지금 화면에서 쓰지 않는다】
 * 2026-09-10 사장님 지시로 학과 디렉토리에서 **외부 링크를 전부 걷어냈다.**
 * 확인이 불분명한 주소가 섞여 있고, 우리가 임의로 남의 학과 주소를 걸어 두는 것 자체가
 * 위험 부담이라는 판단이다. 그래서 /muol/universities는 학과 이름만 텍스트로 싣는다.
 * 이 필드를 지우지 않고 남겨 두는 이유는, 학과와 연락이 닿아 주소가 확인되면 그때 쓸 수 있어서다.
 * (값 자체는 원본에서 `[운영자 확인 필요]` 마커가 없는 것만 담겨 있다.)
 * **화면에 링크를 되살리려면 사장님 확인을 먼저 받을 것.**
 *
 * 【실측 수치 — 대외 문서에 쓸 때 이 줄을 기준으로】
 * 학과 161개 · 대학 103개 · 지역 17개
 * ("92개 학과"·"16개 지역"·"200여개"는 전부 낡은 오류값이다)
 */

export type Department = {
  /** 17개 광역시·도 중 하나 */
  region: string;
  /** 대학 정식 명칭 */
  school: string;
  /** 학과·전공 단위 명칭 */
  dept: string;
  /** 원본 표기의 장르(복수는 가운뎃점으로 이어 붙어 있다) */
  genre: string;
  /** 확인된 학과 홈페이지. 미확인이면 null */
  url: string | null;
};

/** 정렬 기준: 지역(아래 REGION_ORDER 순) → 학교 가나다 → 학과 가나다 */
export const DEPARTMENTS: readonly Department[] = [
  { region: "서울", school: "건국대학교", dept: "영화학과", genre: "영화", url: null },
  { region: "서울", school: "경기대학교", dept: "연기학과", genre: "연극", url: null },
  { region: "서울", school: "경희대학교", dept: "무용학부", genre: "무용", url: null },
  { region: "서울", school: "경희대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "서울", school: "경희대학교", dept: "포스트모던음악학과", genre: "음악", url: null },
  { region: "서울", school: "국민대학교", dept: "공연예술학부 연극전공", genre: "연극", url: "https://art.kookmin.ac.kr/performingart" },
  { region: "서울", school: "동국대학교", dept: "연극학부", genre: "연극", url: "https://theatre.dongguk.edu" },
  { region: "서울", school: "동국대학교", dept: "영화영상학과", genre: "영화", url: null },
  { region: "서울", school: "동덕여자대학교", dept: "공연예술대학 (방송연예/모델/실용음악/뮤지컬/무용)", genre: "연극·뮤지컬·무용·음악", url: null },
  { region: "서울", school: "명지대학교", dept: "영화·뮤지컬학부", genre: "뮤지컬·영화", url: null },
  { region: "서울", school: "삼육대학교", dept: "아트앤디자인학과 연기전공", genre: "연극", url: null },
  { region: "서울", school: "상명대학교", dept: "무용예술전공", genre: "무용", url: null },
  { region: "서울", school: "상명대학교", dept: "연극학과", genre: "연극", url: null },
  { region: "서울", school: "상명대학교", dept: "영화영상전공", genre: "영화", url: null },
  { region: "서울", school: "상명대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "서울", school: "서경대학교", dept: "공연예술학부 (연기/뮤지컬/연출/실용무용/한국무용/모델)", genre: "연극·뮤지컬·무용", url: null },
  { region: "서울", school: "서울과학기술대학교", dept: "문예창작학과", genre: "문예창작", url: null },
  { region: "서울", school: "서울대학교", dept: "음악대학 (성악/작곡/기악/국악)", genre: "음악·국악", url: null },
  { region: "서울", school: "서울예술대학교", dept: "극작전공", genre: "연극·문예창작", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "무용전공", genre: "무용", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "문예창작전공", genre: "문예창작", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "뮤지컬전공", genre: "뮤지컬", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "연기예술전공", genre: "연극", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "연출전공", genre: "연극", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "서울예술대학교", dept: "영화전공", genre: "영화", url: "https://www.seoularts.ac.kr" },
  { region: "서울", school: "성균관대학교", dept: "연기예술학과", genre: "연극", url: "https://act.skku.edu" },
  { region: "서울", school: "성신여자대학교", dept: "무용예술학과", genre: "무용", url: null },
  { region: "서울", school: "성신여자대학교", dept: "미디어영상연기학과", genre: "연극·영화", url: null },
  { region: "서울", school: "성신여자대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "서울", school: "세종대학교", dept: "무용과", genre: "무용", url: null },
  { region: "서울", school: "세종대학교", dept: "영화예술학과", genre: "영화", url: null },
  { region: "서울", school: "세종대학교", dept: "음악과", genre: "음악", url: null },
  { region: "서울", school: "숙명여자대학교", dept: "무용과", genre: "무용", url: null },
  { region: "서울", school: "숭의여자대학교", dept: "실용음악과", genre: "음악", url: null },
  { region: "서울", school: "숭의여자대학교", dept: "연기예술과", genre: "연극", url: null },
  { region: "서울", school: "연세대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "서울", school: "이화여자대학교", dept: "무용과", genre: "무용", url: null },
  { region: "서울", school: "이화여자대학교", dept: "음악대학", genre: "음악·국악", url: null },
  { region: "서울", school: "정화예술대학교", dept: "융합예술학부 연기전공", genre: "연극", url: null },
  { region: "서울", school: "중앙대학교", dept: "국악대학", genre: "국악·전통예술", url: null },
  { region: "서울", school: "중앙대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "서울", school: "중앙대학교", dept: "문예창작전공", genre: "문예창작", url: null },
  { region: "서울", school: "중앙대학교", dept: "연극학과", genre: "연극", url: "https://theatre.cau.ac.kr" },
  { region: "서울", school: "중앙대학교", dept: "영화학과", genre: "영화", url: null },
  { region: "서울", school: "추계예술대학교", dept: "관현악과", genre: "음악", url: null },
  { region: "서울", school: "한국예술종합학교", dept: "무용원", genre: "무용", url: "https://www.karts.ac.kr/school/dance/" },
  { region: "서울", school: "한국예술종합학교", dept: "연극원", genre: "연극", url: "https://www.karts.ac.kr/school/drama/" },
  { region: "서울", school: "한국예술종합학교", dept: "영상원", genre: "영화", url: null },
  { region: "서울", school: "한국예술종합학교", dept: "음악원", genre: "음악", url: "https://www.karts.ac.kr/school/music/" },
  { region: "서울", school: "한국예술종합학교", dept: "전통예술원", genre: "전통예술·국악", url: "https://www.karts.ac.kr/school/k_arts/" },
  { region: "서울", school: "한국체육대학교", dept: "공연예술학과", genre: "연극", url: null },
  { region: "서울", school: "한성대학교", dept: "ICT디자인학부 영상·애니메이션트랙", genre: "영화", url: null },
  { region: "서울", school: "한성대학교", dept: "무용전공", genre: "무용", url: null },
  { region: "서울", school: "한양대학교", dept: "관현악과", genre: "음악", url: null },
  { region: "서울", school: "한양대학교", dept: "국악과", genre: "국악", url: null },
  { region: "서울", school: "한양대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "서울", school: "한양대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "서울", school: "홍익대학교", dept: "공연예술학부", genre: "연극·뮤지컬", url: null },
  { region: "부산", school: "경성대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "부산", school: "경성대학교", dept: "연극영화학부", genre: "연극·영화", url: null },
  { region: "부산", school: "동서대학교", dept: "임권택영화예술대학 영화과", genre: "영화", url: null },
  { region: "부산", school: "동아대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "부산", school: "동아대학교", dept: "음악학과", genre: "음악", url: null },
  { region: "부산", school: "동의대학교", dept: "영화학과", genre: "영화", url: null },
  { region: "부산", school: "부경대학교", dept: "영상학부", genre: "영화", url: null },
  { region: "부산", school: "부산대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "부산", school: "부산대학교", dept: "예술문화영상학과", genre: "영화", url: null },
  { region: "부산", school: "부산대학교", dept: "음악학과", genre: "음악", url: null },
  { region: "부산", school: "부산대학교", dept: "한국음악학과", genre: "국악", url: null },
  { region: "부산", school: "부산예술대학교", dept: "실용음악과", genre: "음악", url: null },
  { region: "부산", school: "신라대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "부산", school: "영산대학교", dept: "연기공연예술전공 (해운대캠퍼스)", genre: "연극", url: null },
  { region: "대구", school: "경북대학교", dept: "국악학과", genre: "국악", url: null },
  { region: "대구", school: "계명대학교", dept: "공연예술학과", genre: "연극·뮤지컬", url: null },
  { region: "대구", school: "계명대학교", dept: "무용전공", genre: "무용", url: null },
  { region: "대구", school: "대구가톨릭대학교", dept: "공연예술학과", genre: "연극·뮤지컬", url: null },
  { region: "대구", school: "대구가톨릭대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "대구", school: "영남대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "대구", school: "영남대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "인천", school: "인천대학교", dept: "공연예술학과", genre: "연극·뮤지컬", url: null },
  { region: "인천", school: "인하대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "광주", school: "광주대학교", dept: "공연예술학과 (연기/뮤지컬)", genre: "연극·뮤지컬", url: null },
  { region: "광주", school: "송원대학교", dept: "공연예술학과", genre: "연극", url: null },
  { region: "광주", school: "전남대학교", dept: "국악학과", genre: "국악", url: null },
  { region: "광주", school: "전남대학교", dept: "음악학과", genre: "음악", url: null },
  { region: "광주", school: "조선대학교", dept: "K-컬쳐공연기획학과", genre: "연극", url: null },
  { region: "광주", school: "조선대학교", dept: "공연예술무용과", genre: "무용", url: null },
  { region: "광주", school: "호남대학교", dept: "공연영상학과", genre: "연극·영화", url: null },
  { region: "대전", school: "목원대학교", dept: "영화영상학과", genre: "영화", url: null },
  { region: "대전", school: "목원대학교", dept: "음악대학", genre: "음악", url: null },
  { region: "대전", school: "충남대학교", dept: "국악학과", genre: "국악", url: null },
  { region: "대전", school: "충남대학교", dept: "음악과", genre: "음악", url: null },
  { region: "대전", school: "한남대학교", dept: "공연예술학과", genre: "연극·뮤지컬", url: null },
  { region: "울산", school: "울산대학교", dept: "음악학부", genre: "음악", url: null },
  { region: "세종", school: "고려대학교 세종캠퍼스", dept: "문화창의학부", genre: "문예창작", url: null },
  { region: "경기", school: "가천대학교", dept: "연기예술학과", genre: "연극", url: null },
  { region: "경기", school: "단국대학교", dept: "공연영화학부 (연극/뮤지컬/영화)", genre: "연극·뮤지컬·영화", url: null },
  { region: "경기", school: "단국대학교", dept: "국악과", genre: "국악", url: null },
  { region: "경기", school: "단국대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "경기", school: "단국대학교", dept: "음악학부", genre: "음악", url: null },
  { region: "경기", school: "대진대학교", dept: "연극영화학부", genre: "연극·영화", url: null },
  { region: "경기", school: "동서울대학교", dept: "실용음악과", genre: "음악", url: null },
  { region: "경기", school: "동서울대학교", dept: "연기예술학과", genre: "연극", url: null },
  { region: "경기", school: "동아방송예술대학교", dept: "공연예술학부", genre: "연극·뮤지컬", url: null },
  { region: "경기", school: "동아방송예술대학교", dept: "기악과", genre: "음악", url: null },
  { region: "경기", school: "동양대학교", dept: "공연영상학부 (동두천캠퍼스)", genre: "연극·영화", url: null },
  { region: "경기", school: "성결대학교", dept: "연기예술학과", genre: "연극", url: null },
  { region: "경기", school: "성결대학교", dept: "음악학부", genre: "음악", url: null },
  { region: "경기", school: "수원대학교", dept: "무용학부", genre: "무용", url: null },
  { region: "경기", school: "수원대학교", dept: "연극영화학부", genre: "연극·영화", url: null },
  { region: "경기", school: "수원여자대학교", dept: "방송공연예술과", genre: "연극", url: null },
  { region: "경기", school: "안양대학교", dept: "공연예술학과", genre: "연극", url: null },
  { region: "경기", school: "예원예술대학교", dept: "공연예술학부 (양주캠퍼스)", genre: "연극", url: null },
  { region: "경기", school: "용인대학교", dept: "국악과", genre: "국악", url: null },
  { region: "경기", school: "용인대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "경기", school: "용인대학교", dept: "연극학과", genre: "연극", url: null },
  { region: "경기", school: "용인대학교", dept: "영화영상학과", genre: "영화", url: null },
  { region: "경기", school: "중부대학교", dept: "연극영화학전공 (고양캠퍼스)", genre: "연극·영화", url: null },
  { region: "경기", school: "중앙대학교 (안성)", dept: "공연영상창작학부", genre: "연극·영화", url: null },
  { region: "경기", school: "청강문화산업대학교", dept: "공연예술스쿨 (뮤지컬/연기)", genre: "연극·뮤지컬", url: null },
  { region: "경기", school: "평택대학교", dept: "공연예술학과", genre: "연극·뮤지컬", url: null },
  { region: "경기", school: "평택대학교", dept: "음악학부", genre: "음악", url: null },
  { region: "경기", school: "한세대학교", dept: "예술학부", genre: "연극·음악", url: null },
  { region: "강원", school: "강원대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "강원", school: "송호대학교", dept: "연기과", genre: "연극", url: null },
  { region: "강원", school: "한림대학교", dept: "영상학교 (영화영상학)", genre: "영화", url: null },
  { region: "충북", school: "극동대학교", dept: "연극연기학과", genre: "연극", url: null },
  { region: "충북", school: "세명대학교", dept: "연기예술학과", genre: "연극", url: null },
  { region: "충북", school: "청주대학교", dept: "연극영화학부", genre: "연극·영화", url: null },
  { region: "충북", school: "충북대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "충북", school: "충청대학교", dept: "실용음악과", genre: "음악", url: null },
  { region: "충남", school: "공주대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "충남", school: "공주대학교", dept: "영상학과", genre: "영화", url: null },
  { region: "충남", school: "백석대학교", dept: "공연예술학부", genre: "연극·뮤지컬", url: null },
  { region: "충남", school: "상명대학교 (천안캠퍼스)", dept: "공연영상·문화예술학부", genre: "연극·영화", url: null },
  { region: "충남", school: "순천향대학교", dept: "공연영상학과", genre: "연극·영화", url: null },
  { region: "충남", school: "청운대학교", dept: "연극예술학과", genre: "연극", url: null },
  { region: "충남", school: "한국영상대학교", dept: "영화영상학과", genre: "영화", url: null },
  { region: "충남", school: "호서대학교", dept: "연극학과", genre: "연극", url: null },
  { region: "전북", school: "국립군산대학교", dept: "음악과", genre: "음악", url: null },
  { region: "전북", school: "백제예술대학교", dept: "실용댄스과", genre: "무용", url: null },
  { region: "전북", school: "우석대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "전북", school: "원광대학교", dept: "무용·예술학과", genre: "무용", url: null },
  { region: "전북", school: "전북대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "전북", school: "전북대학교", dept: "음악과", genre: "음악", url: null },
  { region: "전북", school: "전북대학교", dept: "한국음악학과", genre: "국악", url: null },
  { region: "전북", school: "전주대학교", dept: "공연방송연기학과", genre: "연극", url: null },
  { region: "전북", school: "전주대학교", dept: "영화방송학과", genre: "영화", url: null },
  { region: "전북", school: "호원대학교", dept: "공연미디어학부", genre: "연극", url: null },
  { region: "전남", school: "국립목포대학교", dept: "공연음악전공", genre: "음악", url: null },
  { region: "전남", school: "동신대학교", dept: "공연전시기획학과", genre: "연극·뮤지컬", url: null },
  { region: "전남", school: "동신대학교", dept: "뮤지컬·실용음악학과", genre: "뮤지컬·음악", url: null },
  { region: "전남", school: "목포대학교", dept: "무용과", genre: "무용", url: null },
  { region: "경북", school: "대구예술대학교", dept: "공연예술학부", genre: "연극·뮤지컬·무용", url: null },
  { region: "경북", school: "동국대학교 WISE캠퍼스(경주)", dept: "공연예술학부", genre: "연극·뮤지컬", url: null },
  { region: "경북", school: "안동대학교", dept: "한국음악학과", genre: "국악", url: null },
  { region: "경남", school: "경남대학교", dept: "연극영화학과", genre: "연극·영화", url: null },
  { region: "경남", school: "경상국립대학교", dept: "민속무용학과", genre: "무용·전통예술", url: null },
  { region: "경남", school: "인제대학교", dept: "공연영상학과", genre: "연극·영화", url: null },
  { region: "경남", school: "창원대학교", dept: "무용학과", genre: "무용", url: null },
  { region: "제주", school: "제주대학교", dept: "음악학부", genre: "음악", url: null },
];

/** 지역 표시 순서 — 서울부터, 광역시·도 관례 순 */
export const REGION_ORDER: readonly string[] = ["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];

/** 학과 161 · 대학 103 · 지역 17 — 화면 문구에 쓰는 실측 수치 */
export const DEPARTMENT_COUNT = 161;
export const SCHOOL_COUNT = 103;

/** 지역별 학과 수 (0인 지역은 화면에서 칩을 흐리게 처리하는 데 쓴다) */
export function countByRegion(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of REGION_ORDER) out[r] = 0;
  for (const d of DEPARTMENTS) out[d.region] = (out[d.region] ?? 0) + 1;
  return out;
}

/** 등록 폼 자동완성용 — "학교 학과" 한 줄 표기.
 *  이 문자열을 shows.school_department에 그대로 저장하면 표기 흔들림이 생기지 않는다
 *  ("동덕여대 공연예술학과"와 "동덕여자대학교 공연예술학과"가 따로 쌓이던 문제). */
export function fullName(d: Department): string {
  return `${d.school} ${d.dept}`;
}

/** 저장된 school_department 문자열로 명부에서 해당 학과를 찾는다(정확히 일치할 때만). */
export function findByFullName(raw: string | null | undefined): Department | null {
  if (!raw) return null;
  const key = raw.trim();
  return DEPARTMENTS.find((d) => fullName(d) === key) ?? null;
}
