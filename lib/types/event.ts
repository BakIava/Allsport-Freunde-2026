export type EventStatus = "draft" | "published" | "cancelled";

export type EventCategory = "fussball" | "fitness" | "schwimmen";

export interface Event {
  id: number;
  title: string;
  category: EventCategory;
  description: string;
  date: string;
  time: string;
  location: string;
  parking_location: string | null;
  price: string;
  /** Numeric entry price per person in Euro (null = free / not set) */
  entry_price?: number | null;
  dress_code: string;
  max_participants: number;
  /** Max persons per email address (default 5) */
  max_per_email: number;
  status: EventStatus;
  cancellation_reason: string | null;
  published_at: string | null;
  created_at: string;
  /** Optional URL for post-event feedback survey */
  survey_url?: string | null;
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
  /**
   * Occupancy as a percentage (0–100). Used by the public site instead of the
   * raw participant counts, so the exact number of spots is never exposed.
   */
  occupancy_percentage?: number;
  /** Whether the event is fully booked. Public flag that avoids exposing raw counts. */
  is_full?: boolean;
  /** Finance summary – included in admin getAllEvents query */
  total_costs?: number;
  expected_revenue?: number;
  actual_revenue?: number;
  total_donations?: number;
  /** Physical cash count entered at end of event (from events.cash_counted) */
  cash_counted?: number | null;
  cash_counted_at?: string | null;
  /** Check-in summary for past events – included in admin getAllEvents query */
  total_registrations?: number;  // approved non-walk-in registrations
  checkin_count?: number;        // checked-in non-walk-in registrations
  walk_in_count?: number;        // approved walk-in registrations
}

/**
 * Strip raw participant counts from an event and replace them with a percentage
 * + full flag. Used for the public events list so the exact number of spots
 * (max / current / pending) is never sent to the browser.
 */
export function toPublicEvent(e: EventWithRegistrations): EventWithRegistrations {
  const current = e.current_participants ?? 0;
  const max = e.max_participants ?? 0;
  const isFull = max > 0 && current >= max;
  // Never round up to 100 % unless the event is actually full.
  let occupancy = 0;
  if (max > 0) {
    occupancy = isFull ? 100 : Math.min(99, Math.round((current / max) * 100));
  }

  // Remove the raw counts so they never reach the public client.
  const {
    max_participants: _max,
    current_participants: _current,
    pending_participants: _pending,
    ...rest
  } = e;

  return {
    ...rest,
    occupancy_percentage: occupancy,
    is_full: isFull,
  } as EventWithRegistrations;
}

export interface EventCreateInput {
  title: string;
  category: EventCategory;
  description: string;
  date: string;
  time: string;
  location: string;
  parking_location?: string;
  price: string;
  /** Numeric entry price per person in Euro (null/undefined = free) */
  entry_price?: number | null;
  dress_code: string;
  max_participants: number;
  /** Max persons per email address (default 5) */
  max_per_email?: number;
  /** Optional URL for post-event feedback survey */
  survey_url?: string | null;
  images?: EventImageInput[];
}

export interface PublishEventResult {
  success: boolean;
  /** Only set when unpublish is blocked */
  registrationCount?: number;
}

export interface CancelEventResult {
  alreadyCancelled: boolean;
  event: { title: string; date: string; time: string; location: string } | null;
  registrations: Array<{ email: string | null; first_name: string; last_name: string; status_token: string }>;
}
