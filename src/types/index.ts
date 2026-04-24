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
};

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: "member" | "performer" | "admin";
  created_at: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "pending" | "resolved";
  created_at: string;
};
