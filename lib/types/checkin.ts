import type { RegistrationPerson } from "./registration";

export interface CheckinParticipant {
  id: number;
  /** From JOIN with registration_persons (first person) */
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  /** Active person count - 1 (companions) */
  guests: number;
  /** Registration-level check-in timestamp (set when QR scanned) */
  checked_in_at: string | null;
  checked_in_by: string | null;
  is_walk_in: boolean;
  notes: string | null;
  /** All persons for this registration with individual check-in state */
  persons: RegistrationPerson[];
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

/** One event row on the check-in overview (incl. finance summary). */
export interface CheckinEventRow {
  id: number;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  entry_price: number | null;
  approved_count: number;
  checked_in_count: number;
  total_costs: number;
  total_donations: number;
  expected_revenue: number;
  actual_revenue: number;
}

/** Grouped result of the check-in events overview. */
export interface CheckinEventsOverview {
  today: CheckinEventRow[];
  upcoming: CheckinEventRow[];
  past: CheckinEventRow[];
}

/** Registration as returned by the QR-token lookup (scanner preview). */
export interface CheckinLookupRegistration {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  status: string;
  checked_in_at: string | null;
  is_walk_in: boolean;
  persons: RegistrationPerson[];
}
