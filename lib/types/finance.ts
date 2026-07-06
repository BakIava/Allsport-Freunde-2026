export interface EventCost {
  id: number;
  event_id: number;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface EventDonation {
  id: number;
  event_id: number;
  registration_id: number | null;
  donor_name: string;
  amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EventFinancials {
  entry_price: number | null;
  total_costs: number;
  /** Approved registrations + their guests */
  approved_persons: number;
  approved_guests: number;
  expected_revenue: number;
  /** Checked-in registrations + their guests */
  checkedin_persons: number;
  checkedin_guests: number;
  actual_revenue: number;
  /** Sum of all donations */
  total_donations: number;
  donation_count: number;
  /** Actual revenue + donations − costs */
  balance: number;
  costs: EventCost[];
  donations: EventDonation[];
  /** Physical cash count entered at end of event */
  cash_counted: number | null;
  cash_counted_at: string | null;
}
