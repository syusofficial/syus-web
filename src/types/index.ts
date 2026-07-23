export type Show = {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  poster_url?: string;
  venue: string;
  venue_address?: string;
  schedule_start?: string;
  schedule_end?: string;
  cast_members?: string[];
  directions?: string;
  ticket_url?: string;          // (레거시) 상업 예매처 URL (인터파크·티켓링크 등) - 신규 등록 유도 중단
  reservation_url?: string;     // 예매·좌석 신청 링크 (공연팀 자체 폼: 구글폼·네이버폼 등) - 무대올림 정체성
  status: "pending" | "approved" | "rejected";
  created_at: string;
  organizer_id?: string;
  performer_name?: string;

  // 신규 카테고리 / 상세 필드
  genre?: string;              // 연극 | 뮤지컬 | 무용 | 국악 | 음악 | 전통연희 | 기타 (2026-06-17 발레 제거)
  genre_detail?: string;       // 무용 → 발레·현대무용·한국무용 / 음악 → 클래식·실용음악·합창·앙상블
  genre_custom?: string;       // 기타 선택 시 직접 입력
  show_category?: string;      // 교내 공연 | 외부 공연 | 워크샵
  region?: string;             // 전체 | 서울 | 경기 | ...
  school_department?: string;  // 대학 및 학과명
  show_time?: string;          // 공연 시간 (예: 평일 19:30)
  running_time?: string;       // 러닝 타임 (예: 100분)
  age_rating?: string;         // 관람 연령 (예: 7세 이상)
  map_kakao_url?: string;      // 카카오맵 링크
  map_naver_url?: string;      // 네이버지도 링크

  // 운영·통계 필드
  featured?: boolean;          // 운영자 픽 (메인 페이지 노출)
  view_count?: number;         // 누적 조회수

  // 자체 예매(좌석 신청) 필드 - 2026-07-06 신설
  capacity?: number | null;              // 좌석 정원(선택). null이면 무제한
  use_inhouse_reservation?: boolean;     // 무대올림 자체 예약 시스템 사용 여부(기본 true)
  reservation_closed?: boolean;          // 공연팀이 직접 예약 마감(매진) 처리했는지 - 2026-07-07 신설
};

export type ReservationStatus = "confirmed" | "waitlisted" | "cancelled";

/** 공연 회차 — 예약 시스템 B1(회차별 정원 분리), 2026-07-24 신설. */
export type ShowSession = {
  id: string;
  show_id: string;
  session_at: string;       // 회차 날짜+시간 (timestamptz)
  capacity: number | null;  // null이면 공연 전체 정원(shows.capacity)을 그대로 상속
  created_at?: string;
};

/** get_show_reservation_summary RPC의 sessions[] 항목 — 회차별 잔여석 계산에 필요한 값만 포함. */
export type SessionReservationSummary = {
  id: string;
  session_at: string;
  capacity: number | null;
  effective_capacity: number | null; // capacity가 null이면 공연 전체 capacity를 상속한 값
  confirmed_total: number;
};

export type Reservation = {
  id: string;
  show_id: string;
  user_id?: string | null;
  guest_name?: string | null;
  guest_contact?: string | null;
  party_size: number;
  status: ReservationStatus;
  reservation_code: string;
  created_at: string;
  updated_at?: string;
  /** 회차 없는 예약은 null(레거시) — 예약 시스템 B1, 2026-07-24 신설 */
  session_id?: string | null;
  /** 조인 시 (관리자·게스트 조회 화면용) */
  show_title?: string;
  schedule_start?: string;
  schedule_end?: string;
  /** 조인 시(마이페이지·공연자 현황판) — 회차 날짜+시간 */
  session_at?: string | null;
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "member" | "performer" | "admin";
  performer_status?: "pending" | "approved" | "rejected" | null;
  created_at: string;
  /** 관심 공연 D-3/D-1 알림 메일 수신 동의. 기본 true. */
  notify_show_reminders?: boolean | null;
};

export type ReviewStatus = "pending" | "public" | "hidden" | "blocked";

export type Review = {
  id: string;
  show_id: string;
  user_id: string;
  body: string;
  status: ReviewStatus;
  moderation?: {
    score?: number;
    matched?: string[];
    source?: "dict" | "openai" | "both";
    api_categories?: Record<string, boolean>;
  } | null;
  report_count: number;
  created_at: string;
  updated_at?: string | null;
  /** 조인 시 */
  author_nickname?: string | null;
};

export type ReviewReport = {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  category?: string | null;
  message: string;
  status: "pending" | "resolved";
  created_at: string;
  deleted_at?: string | null;
};
