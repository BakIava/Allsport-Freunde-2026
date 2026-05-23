import { getSQL, isPostgresConfigured } from "./utils";
import { findRegistration } from "./registrations";
import type { CheckinParticipant, CheckinStatusResponse } from "../types";

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

export async function getCheckinEvents(): Promise<{
  today: CheckinEventRow[];
  upcoming: CheckinEventRow[];
  past: CheckinEventRow[];
}> {
  if (!isPostgresConfigured()) {
    const { getLocalCheckinEvents } = await import("../local-data");
    return getLocalCheckinEvents();
  }

  const sql = getSQL();

  const rows = await sql`
    SELECT
      e.id,
      e.title,
      e.category,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
      e.time::text AS time,
      e.location,
      e.entry_price::float8 AS entry_price,
      COUNT(CASE WHEN r.status = 'approved' THEN rp.id ELSE NULL END)::int AS approved_count,
      COUNT(CASE WHEN r.status = 'approved' AND r.checked_in_at IS NOT NULL THEN rp.id ELSE NULL END)::int AS checked_in_count,
      COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
      COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
      COUNT(CASE WHEN r.status = 'approved' THEN rp.id ELSE NULL END)::float8 * COALESCE(e.entry_price::float8, 0) AS expected_revenue,
      COUNT(CASE WHEN r.status = 'approved' AND r.checked_in_at IS NOT NULL THEN rp.id ELSE NULL END)::float8 * COALESCE(e.entry_price::float8, 0) AS actual_revenue
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    LEFT JOIN registration_persons rp ON rp.registration_id = r.id AND rp.cancelled_at IS NULL
    WHERE e.status = 'published' AND e.date >= CURRENT_DATE
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `;

  const pastRows = await sql`
    SELECT
      e.id,
      e.title,
      e.category,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
      e.time::text AS time,
      e.location,
      e.entry_price::float8 AS entry_price,
      COUNT(CASE WHEN r.status = 'approved' THEN rp.id ELSE NULL END)::int AS approved_count,
      COUNT(CASE WHEN r.status = 'approved' AND r.checked_in_at IS NOT NULL THEN rp.id ELSE NULL END)::int AS checked_in_count,
      COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
      COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
      COUNT(CASE WHEN r.status = 'approved' THEN rp.id ELSE NULL END)::float8 * COALESCE(e.entry_price::float8, 0) AS expected_revenue,
      COUNT(CASE WHEN r.status = 'approved' AND r.checked_in_at IS NOT NULL THEN rp.id ELSE NULL END)::float8 * COALESCE(e.entry_price::float8, 0) AS actual_revenue
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    LEFT JOIN registration_persons rp ON rp.registration_id = r.id AND rp.cancelled_at IS NULL
    WHERE e.status = 'published' AND e.date < CURRENT_DATE
    GROUP BY e.id
    ORDER BY e.date DESC, e.time DESC
    LIMIT 10
  `;

  // process.env.TZ can be ":UTC" (POSIX prefix) which Intl rejects – strip it
  const tz = (process.env.TZ || "Europe/Berlin").replace(/^:/, "");
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: tz });

  return {
    today: (rows as CheckinEventRow[]).filter((r) => r.date === todayStr),
    upcoming: (rows as CheckinEventRow[]).filter((r) => r.date > todayStr),
    past: pastRows as CheckinEventRow[],
  };
}

export async function saveQRCode(
  registrationId: number,
  qrCode: string,
  qrToken: string
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registrations SET qr_code = ${qrCode}, qr_token = ${qrToken}
    WHERE id = ${registrationId}
  `;
}

export async function getRegistrationByQRToken(
  qrToken: string
): Promise<import("../types").RegistrationWithEvent | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.id, r.event_id, r.email, r.phone, r.status, r.status_token,
      r.status_changed_at, r.status_note, r.created_at,
      r.qr_code, r.qr_token, r.checked_in_at, r.checked_in_by,
      r.is_walk_in, r.notes, r.reminder_sent_at,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      (SELECT COUNT(*)::int FROM registration_persons rp WHERE rp.registration_id = r.id AND rp.cancelled_at IS NULL) AS person_count,
      e.title AS event_title, TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date, e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.qr_token = ${qrToken}
  `;
  return (rows[0] as import("../types").RegistrationWithEvent) ?? null;
}

export async function markCheckedIn(
  registrationId: number,
  checkedInBy: string
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registrations
    SET checked_in_at = NOW(), checked_in_by = ${checkedInBy}
    WHERE id = ${registrationId}
  `;
}

export async function getCheckinStatus(eventId: number): Promise<CheckinStatusResponse> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.id, r.email, r.phone, r.checked_in_at, r.checked_in_by, r.is_walk_in, r.notes,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      GREATEST(0, (SELECT COUNT(*)::int FROM registration_persons rp WHERE rp.registration_id = r.id AND rp.cancelled_at IS NULL) - 1) AS guests
    FROM registrations r
    WHERE r.event_id = ${eventId} AND r.status = 'approved'
    ORDER BY
      (SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1) ASC,
      (SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1) ASC
  `;

  const participants = rows as CheckinParticipant[];
  const totalRegistrations = participants.length;
  const totalGuests = participants.reduce((sum, p) => sum + p.guests, 0);
  const total = totalRegistrations + totalGuests;
  const checkedIn = participants
    .filter((p) => p.checked_in_at !== null)
    .reduce((sum, p) => sum + p.guests + 1, 0);
  const walkIns = participants.filter((p) => p.is_walk_in);
  const walkInRegistrations = walkIns.length;
  const walkInGuests = walkIns.reduce((sum, p) => sum + p.guests, 0);

  return {
    total,
    checked_in: checkedIn,
    missing: total - checkedIn,
    total_registrations: totalRegistrations,
    total_guests: totalGuests,
    walk_in_registrations: walkInRegistrations,
    walk_in_guests: walkInGuests,
    participants,
  };
}

export async function createWalkInRegistration(data: {
  event_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  checked_in_by: string | null;
  guests?: number;
}): Promise<{ id: number; alreadyExists: boolean }> {
  if (!isPostgresConfigured()) {
    const { createLocalWalkInRegistration } = await import("../local-data");
    return createLocalWalkInRegistration(data);
  }

  if (data.email) {
    const existing = await findRegistration(data.event_id, data.email);
    if (existing) return { id: existing.id, alreadyExists: true };
  }

  const sql = getSQL();
  const statusToken = crypto.randomUUID();
  const guestCount = data.guests ?? 0;

  const rows = await sql`
    INSERT INTO registrations
      (event_id, email, phone, status, status_token, is_walk_in, notes, checked_in_at, checked_in_by, status_changed_at)
    VALUES
      (${data.event_id}, ${data.email}, ${data.phone}, 'approved', ${statusToken},
       TRUE, ${data.notes}, ${data.checked_in_by ? sql`NOW()` : sql`NULL`}, ${data.checked_in_by ?? null}, NOW())
    RETURNING id
  `;
  const registrationId = (rows[0] as { id: number }).id;

  // Main person
  await sql`
    INSERT INTO registration_persons (registration_id, first_name, last_name)
    VALUES (${registrationId}, ${data.first_name}, ${data.last_name})
  `;

  // Companion placeholders
  for (let i = 0; i < guestCount; i++) {
    await sql`
      INSERT INTO registration_persons (registration_id, first_name, last_name)
      VALUES (${registrationId}, 'Begleitperson', 'Begleitperson')
    `;
  }

  return { id: registrationId, alreadyExists: false };
}

export async function undoCheckin(registrationId: number): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registrations
    SET checked_in_at = NULL, checked_in_by = NULL
    WHERE id = ${registrationId} AND status = 'approved'
  `;
}

export async function manualCheckin(
  registrationId: number,
  checkedInBy: string
): Promise<{ alreadyCheckedIn: boolean }> {
  const sql = getSQL();
  const rows = await sql`
    SELECT checked_in_at FROM registrations WHERE id = ${registrationId} AND status = 'approved'
  `;

  if (!rows[0]) throw new Error("Anmeldung nicht gefunden oder nicht genehmigt.");

  const reg = rows[0] as { checked_in_at: string | null };
  if (reg.checked_in_at) return { alreadyCheckedIn: true };

  await markCheckedIn(registrationId, checkedInBy);
  return { alreadyCheckedIn: false };
}
