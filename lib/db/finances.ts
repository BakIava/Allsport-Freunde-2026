import { getSQL } from "./utils";
import type { EventCost, EventDonation, EventFinancials } from "../types";

export async function getEventCosts(eventId: number): Promise<EventCost[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, event_id, description, amount::float8 AS amount, created_at, updated_at
    FROM event_costs
    WHERE event_id = ${eventId}
    ORDER BY created_at ASC
  `;
  return rows as EventCost[];
}

export async function createEventCost(
  eventId: number,
  description: string,
  amount: number
): Promise<EventCost> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO event_costs (event_id, description, amount)
    VALUES (${eventId}, ${description}, ${amount})
    RETURNING id, event_id, description, amount::float8 AS amount, created_at, updated_at
  `;
  return rows[0] as EventCost;
}

export async function updateEventCost(
  costId: number,
  description: string,
  amount: number
): Promise<EventCost | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE event_costs
    SET description = ${description}, amount = ${amount}, updated_at = NOW()
    WHERE id = ${costId}
    RETURNING id, event_id, description, amount::float8 AS amount, created_at, updated_at
  `;
  return (rows[0] as EventCost) ?? null;
}

export async function deleteEventCost(costId: number): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM event_costs WHERE id = ${costId}`;
}

export async function getEventCostById(costId: number): Promise<EventCost | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, event_id, description, amount::float8 AS amount, created_at, updated_at
    FROM event_costs WHERE id = ${costId}
  `;
  return (rows[0] as EventCost) ?? null;
}

export async function getEventDonations(eventId: number): Promise<EventDonation[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, event_id, registration_id, donor_name, amount::float8 AS amount, note, created_by, created_at
    FROM event_donations
    WHERE event_id = ${eventId}
    ORDER BY created_at ASC
  `;
  return rows as EventDonation[];
}

export async function getDonationById(donationId: number): Promise<EventDonation | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, event_id, registration_id, donor_name, amount::float8 AS amount, note, created_by, created_at
    FROM event_donations WHERE id = ${donationId}
  `;
  return (rows[0] as EventDonation) ?? null;
}

export async function createDonation(
  eventId: number,
  registrationId: number | null,
  donorName: string,
  amount: number,
  note: string | null,
  createdBy: string | null
): Promise<EventDonation> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO event_donations (event_id, registration_id, donor_name, amount, note, created_by)
    VALUES (${eventId}, ${registrationId}, ${donorName}, ${amount}, ${note}, ${createdBy})
    RETURNING id, event_id, registration_id, donor_name, amount::float8 AS amount, note, created_by, created_at
  `;
  return rows[0] as EventDonation;
}

export async function deleteDonation(donationId: number): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM event_donations WHERE id = ${donationId}`;
}

export async function getEventFinancials(eventId: number): Promise<EventFinancials> {
  const sql = getSQL();

  // Entry price (column may not exist if migration not run yet)
  let entryPrice: number | null = null;
  try {
    const eventRows = await sql`SELECT entry_price::float8 AS entry_price FROM events WHERE id = ${eventId}`;
    entryPrice = (eventRows[0] as { entry_price: number | null })?.entry_price ?? null;
  } catch {
    // entry_price column not yet migrated – treat as null
  }

  // Costs (table may not exist if migration not run yet)
  let costs: EventCost[] = [];
  try {
    costs = await getEventCosts(eventId);
  } catch {
    // event_costs table not yet migrated – treat as empty
  }
  const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);

  // Approved registrations (expected revenue)
  const approvedRows = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(guests), 0)::int AS total_guests
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'approved'
  `;
  const approvedCount = (approvedRows[0] as { count: number; total_guests: number }).count;
  const approvedGuests = (approvedRows[0] as { count: number; total_guests: number }).total_guests;
  const expectedRevenue = entryPrice != null ? (approvedCount + approvedGuests) * entryPrice : 0;

  // Checked-in registrations (actual revenue)
  const checkinRows = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(guests), 0)::int AS total_guests
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'approved' AND checked_in_at IS NOT NULL
  `;
  const checkinCount = (checkinRows[0] as { count: number; total_guests: number }).count;
  const checkinGuests = (checkinRows[0] as { count: number; total_guests: number }).total_guests;
  const actualRevenue = entryPrice != null ? (checkinCount + checkinGuests) * entryPrice : 0;

  // Donations (table may not exist if migration not run yet)
  let donations: EventDonation[] = [];
  try {
    donations = await getEventDonations(eventId);
  } catch {
    // event_donations table not yet migrated
  }
  const totalDonations = donations.reduce((sum, d) => sum + d.amount, 0);

  return {
    entry_price: entryPrice,
    total_costs: totalCosts,
    approved_persons: approvedCount,
    approved_guests: approvedGuests,
    expected_revenue: expectedRevenue,
    checkedin_persons: checkinCount,
    checkedin_guests: checkinGuests,
    actual_revenue: actualRevenue,
    total_donations: totalDonations,
    donation_count: donations.length,
    balance: actualRevenue + totalDonations - totalCosts,
    costs,
    donations,
  };
}
