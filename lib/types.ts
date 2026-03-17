export interface Event {
  id: number;
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  date: string;
  time: string;
  location: string;
  price: string;
  dress_code: string;
  max_participants: number;
  created_at: string;
}

export interface EventWithRegistrations extends Event {
  current_participants: number;
}

export interface Registration {
  id: number;
  event_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  guests: number;
  created_at: string;
}

export interface RegistrationRequest {
  event_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  guests: number;
}

export interface RegistrationWithEvent extends Registration {
  event_title: string;
  event_date: string;
  event_category: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface AdminStats {
  total_events: number;
  upcoming_events: number;
  total_registrations: number;
  avg_utilization: number;
}

export interface EventCreateInput {
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  date: string;
  time: string;
  location: string;
  price: string;
  dress_code: string;
  max_participants: number;
}
