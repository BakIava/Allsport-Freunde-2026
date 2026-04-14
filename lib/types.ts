export type EventStatus = "draft" | "published" | "cancelled";

export interface Event {
  id: number;
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  date: string;
  time: string;
  location: string;
  parking_location: string | null;
  price: string;
  dress_code: string;
  max_participants: number;
  status: EventStatus;
  cancellation_reason: string | null;
  published_at: string | null;
  created_at: string;
}

export interface EventImage {
  id: number;
  event_id: number;
  url: string;
  alt_text: string;
  position: number;
}

export interface EventImageInput {
  url: string;
  alt_text: string;
  position: number;
}

export interface EventWithRegistrations extends Event {
  current_participants: number;
  pending_participants?: number;
  images?: EventImage[];
}

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Registration {
  id: number;
  event_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  guests: number;
  status: RegistrationStatus;
  status_token: string;
  status_changed_at: string | null;
  status_note: string | null;
  created_at: string;
  qr_code: string | null;
  qr_token: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  is_walk_in: boolean;
  notes: string | null;
}

export interface WalkInInput {
  event_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string;
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

export interface RegistrationStatusInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  guests: number;
  status: RegistrationStatus;
  status_note: string | null;
  status_changed_at: string | null;
  created_at: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_category: string;
  event_price: string;
  event_dress_code: string;
  qr_code: string | null;
  checked_in_at: string | null;
}

export interface CheckinParticipant {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  guests: number;
  checked_in_at: string | null;
  checked_in_by: string | null;
  is_walk_in: boolean;
  notes: string | null;
}

export interface CheckinStatusResponse {
  total: number;
  checked_in: number;
  missing: number;
  total_registrations: number;
  total_guests: number;
  walk_in_registrations: number;
  walk_in_guests: number;
  participants: CheckinParticipant[];
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
  pending_registrations: number;
  avg_utilization: number;
}

export interface PublishEventResult {
  success: boolean;
  /** Only set when unpublish is blocked */
  registrationCount?: number;
}

export interface CancelEventResult {
  alreadyCancelled: boolean;
  event: { title: string; date: string; time: string; location: string } | null;
  registrations: Pick<Registration, "email" | "first_name" | "last_name" | "status_token">[];
}

export interface EventTemplate {
  id: number;
  /** Display name of the template, e.g. "Monatliches Vereinstraining" */
  name: string;
  /** Default event title pre-filled when using this template */
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  location: string;
  price: string;
  dress_code: string;
  max_participants: number;
  last_used_at: string | null;
  created_at: string;
  images?: EventImageInput[];
}

export interface EventTemplateInput {
  name: string;
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  location: string;
  price: string;
  dress_code: string;
  max_participants: number;
  images?: EventImageInput[];
}

export interface EventCreateInput {
  title: string;
  category: "fussball" | "fitness" | "schwimmen";
  description: string;
  date: string;
  time: string;
  location: string;
  parking_location?: string;
  price: string;
  dress_code: string;
  max_participants: number;
  images?: EventImageInput[];
}

// ─── Contact / Inquiry ───────────────────────────────────

export type InquiryStatus = "open" | "answered" | "resolved";
export type MessageSender = "user" | "admin";

export interface ContactInquiry {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  whatsapp_number: string | null;
  message: string;
  event_id: number | null;
  status: InquiryStatus;
  conversation_token: string;
  consent_to_store: boolean;
  delete_at: string;
  created_at: string;
  updated_at: string;
}

export interface ContactInquiryWithEvent extends ContactInquiry {
  event_title: string | null;
}

export interface InquiryMessage {
  id: number;
  inquiry_id: number;
  sender: MessageSender;
  message: string;
  sent_at: string;
}

export interface ContactInquiryDetail extends ContactInquiryWithEvent {
  messages: InquiryMessage[];
}

export interface ContactFormInput {
  first_name?: string;
  last_name?: string;
  email: string;
  whatsapp_number?: string;
  message: string;
  event_id?: number | null;
  consent_to_store?: boolean;
}
