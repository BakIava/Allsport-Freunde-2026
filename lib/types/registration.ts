import type { PersonName } from "./common";

export type RegistrationStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface RegistrationPerson {
  id: string;
  registration_id: number;
  first_name: string;
  last_name: string;
  checked_in_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface Registration {
  id: number;
  event_id: number;
  email: string | null;
  phone: string | null;
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
  reminder_sent_at: string | null;
  persons?: RegistrationPerson[];
}

export interface CancellationToken {
  id: string;
  token: string;
  registration_id: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
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
  email: string;
  phone: string;
  persons: PersonName[];
}

export interface RegistrationWithEvent extends Registration {
  event_title: string;
  event_date: string;
  event_category: string;
  /** From JOIN with registration_persons (first person) */
  first_name: string;
  last_name: string;
  /** Total person count for this registration */
  person_count: number;
}

export interface RegistrationDetail extends RegistrationWithEvent {
  event_time: string;
  event_location: string;
  /** All persons registered under this email (incl. main person), ordered by created_at */
  persons: RegistrationPerson[];
}

export interface EventPerson {
  person_id: string;
  registration_id: number;
  first_name: string;
  last_name: string;
  checked_in_at: string | null;
  cancelled_at: string | null;
  email: string | null;
  phone: string | null;
  status: RegistrationStatus;
  is_walk_in: boolean;
  created_at: string;
}

export interface RegistrationStatusInfo {
  id: number;
  /** From JOIN with registration_persons (first person) */
  first_name: string;
  last_name: string;
  email: string;
  /** Companion count = person_count - 1 */
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
  persons: RegistrationPerson[];
}

export interface CancellationTokenInfo {
  registrationId: number;
  expiresAt: string;
  usedAt: string | null;
  registrationStatus: string;
  firstName: string;
  lastName: string;
  email: string | null;
  statusToken: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
}

export interface RegistrationDueForReminder {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  status_token: string;
  event_title: string;
  event_date: string;
  event_time: string;
  event_location: string;
}

export interface RegistrationDueForSurvey {
  id: number;
  email: string;
}
