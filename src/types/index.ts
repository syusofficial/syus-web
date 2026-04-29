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
  ticket_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  organizer_id?: string;
  performer_name?: string;

  // 신규 카테고리 / 상세 필드
  genre?: string;              // 연극 | 뮤지컬 | 기타
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
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "member" | "performer" | "admin";
  performer_status?: "pending" | "approved" | "rejected" | null;
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
};
