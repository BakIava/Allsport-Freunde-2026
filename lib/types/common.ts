/**
 * Shared name pair used everywhere a person is entered or passed around
 * (registration forms, walk-ins, e-mail payloads).
 */
export interface PersonName {
  firstName: string;
  lastName: string;
}

export interface AdminStats {
  total_events: number;
  upcoming_events: number;
  total_registrations: number;
  pending_registrations: number;
  avg_utilization: number;
}
