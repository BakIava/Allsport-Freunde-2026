import { getSQL, isPostgresConfigured } from "./utils";
import type {
  RegistrationWithEvent,
  RegistrationDetail,
  RegistrationStatusInfo,
  RegistrationStatus,
} from "../types";

export async function getRegistrationCount(eventId: number): Promise<number> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationCount } = await import("../local-data");
    return getLocalRegistrationCount(eventId);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(rp.id)::int AS count
    FROM registrations r
    JOIN registration_persons rp ON rp.registration_id = r.id AND rp.cancelled_at IS NULL
    WHERE r.event_id = ${eventId} AND r.status = 'approved'
  `;
  return (rows[0] as { count: number }).count;
}

export async function findRegistration(
  eventId: number,
  email: string
): Promise<{ id: number, status: string } | null> {
  if (!isPostgresConfigured()) {
    const { findLocalRegistration } = await import("../local-data");
    const reg = findLocalRegistration(eventId, email);
    return reg ? { id: reg.id, status: reg.status } : null;
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT id, status FROM registrations
    WHERE event_id = ${eventId} AND email = ${email}
  `;

  return (rows[0] as { id: number, status: string }) ?? null;
}

export async function createRegistration(data: {
  event_id: number;
  email: string;
  phone: string;
  status_token: string;
}): Promise<void> {
  if (!isPostgresConfigured()) {
    const { createLocalRegistration } = await import("../local-data");
    createLocalRegistration(data);
    return;
  }

  const sql = getSQL();
  await sql`
    INSERT INTO registrations (event_id, email, phone, status, status_token)
    VALUES (${data.event_id}, ${data.email}, ${data.phone}, 'pending', ${data.status_token})
    ON CONFLICT (email, event_id)
    DO UPDATE SET
      phone = EXCLUDED.phone,
      status = 'pending',
      status_token = EXCLUDED.status_token
  `;
}

export async function getRegistrationByToken(token: string): Promise<RegistrationStatusInfo | null> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationByToken } = await import("../local-data");
    return getLocalRegistrationByToken(token);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.id, r.email,
      r.status, r.status_note, r.status_changed_at, r.created_at,
      r.qr_code, r.checked_in_at,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      GREATEST(0, (SELECT COUNT(*)::int FROM registration_persons rp WHERE rp.registration_id = r.id AND rp.cancelled_at IS NULL) - 1) AS guests,
      e.title AS event_title, TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date, e.time::text AS event_time,
      e.location AS event_location, e.category AS event_category,
      e.price AS event_price, e.dress_code AS event_dress_code
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.status_token = ${token}
  `;
  return (rows[0] as RegistrationStatusInfo) ?? null;
}

export async function cancelRegistrationByToken(token: string): Promise<RegistrationStatusInfo | null> {
  if (!isPostgresConfigured()) {
    const { cancelLocalRegistrationByToken } = await import("../local-data");
    return cancelLocalRegistrationByToken(token);
  }

  const sql = getSQL();
  await sql`
    UPDATE registrations SET
      status = 'cancelled',
      status_changed_at = NOW(),
      status_note = NULL
    WHERE status_token = ${token} AND status IN ('pending', 'approved')
  `;
  return getRegistrationByToken(token);
}

// Helper: correlated subqueries for person name + count
// Used inline in SELECT lists throughout this file.
const personNameCols = `
  COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
  COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
  (SELECT COUNT(*)::int FROM registration_persons rp WHERE rp.registration_id = r.id AND rp.cancelled_at IS NULL) AS person_count
`;
void personNameCols; // Used as documentation; actual SQL is inlined below

export async function getAllRegistrations(): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { getLocalAllRegistrations } = await import("../local-data");
    return getLocalAllRegistrations();
  }

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
      e.title AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    ORDER BY r.created_at DESC
  `;
  return rows as RegistrationWithEvent[];
}

export async function getEventRegistrations(eventId: number): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { getLocalEventRegistrations } = await import("../local-data");
    return getLocalEventRegistrations(eventId);
  }

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
      e.title AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.event_id = ${eventId}
    ORDER BY r.created_at DESC
  `;
  return rows as RegistrationWithEvent[];
}

export async function deleteRegistration(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { deleteLocalRegistration } = await import("../local-data");
    deleteLocalRegistration(id);
    return;
  }

  const sql = getSQL();
  await sql`DELETE FROM registrations WHERE id = ${id}`;
}

export async function updateRegistrationStatus(
  id: number,
  status: RegistrationStatus,
  note?: string
): Promise<RegistrationWithEvent | null> {
  if (!isPostgresConfigured()) {
    const { updateLocalRegistrationStatus } = await import("../local-data");
    return updateLocalRegistrationStatus(id, status, note);
  }

  const sql = getSQL();
  await sql`
    UPDATE registrations SET
      status = ${status},
      status_changed_at = NOW(),
      status_note = ${note || null}
    WHERE id = ${id}
  `;

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
    WHERE r.id = ${id}
  `;
  return (rows[0] as RegistrationWithEvent) ?? null;
}

export async function getRegistrationWithEvent(id: number): Promise<RegistrationWithEvent | null> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationWithEvent } = await import("../local-data");
    return getLocalRegistrationWithEvent(id);
  }

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
    WHERE r.id = ${id}
  `;
  return (rows[0] as RegistrationWithEvent) ?? null;
}

export async function getRegistrationDetail(id: number): Promise<RegistrationDetail | null> {
  if (!isPostgresConfigured()) {
    const base = await getRegistrationWithEvent(id);
    if (!base) return null;
    return { ...base, event_time: "", event_location: "" };
  }

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
      e.title AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.time::text AS event_time,
      e.category AS event_category,
      e.location AS event_location
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ${id}
  `;
  return (rows[0] as RegistrationDetail) ?? null;
}

export async function bulkUpdateRegistrationStatus(
  ids: number[],
  status: RegistrationStatus,
  note?: string
): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { bulkUpdateLocalRegistrationStatus } = await import("../local-data");
    return bulkUpdateLocalRegistrationStatus(ids, status, note);
  }

  const results: RegistrationWithEvent[] = [];
  for (const id of ids) {
    const result = await updateRegistrationStatus(id, status, note);
    if (result) results.push(result);
  }
  return results;
}

export async function cancelRegistrationById(registrationId: number): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registrations
    SET status = 'cancelled', status_changed_at = NOW()
    WHERE id = ${registrationId} AND status IN ('pending', 'approved')
  `;
}

export async function generateCancellationToken(
  registrationId: number,
  eventEndsAt: Date
): Promise<string> {
  const crypto = globalThis.crypto;
  const token = crypto.getRandomValues(new Uint8Array(32)).reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
  const id = crypto.randomUUID();
  const sql = getSQL();
  await sql`
    INSERT INTO cancellation_tokens (id, token, registration_id, expires_at)
    VALUES (${id}, ${token}, ${registrationId}, ${eventEndsAt.toISOString()})
  `;
  return token;
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

export async function getCancellationTokenInfo(
  token: string
): Promise<CancellationTokenInfo | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ct.registration_id,
      ct.expires_at,
      ct.used_at,
      r.status        AS registration_status,
      r.email,
      r.status_token,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      e.title         AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.time::text    AS event_time,
      e.location      AS event_location
    FROM cancellation_tokens ct
    JOIN registrations r ON ct.registration_id = r.id
    JOIN events e ON r.event_id = e.id
    WHERE ct.token = ${token}
  `;
  const row = rows[0] as {
    registration_id: number;
    expires_at: string;
    used_at: string | null;
    registration_status: string;
    first_name: string;
    last_name: string;
    email: string | null;
    status_token: string;
    event_title: string;
    event_date: string;
    event_time: string;
    event_location: string;
  } | undefined;
  if (!row) return null;
  return {
    registrationId: row.registration_id,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    registrationStatus: row.registration_status,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    statusToken: row.status_token,
    eventTitle: row.event_title,
    eventDate: row.event_date,
    eventTime: row.event_time,
    eventLocation: row.event_location,
  };
}

export async function markCancellationTokenUsed(token: string): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE cancellation_tokens
    SET used_at = NOW()
    WHERE token = ${token} AND used_at IS NULL AND expires_at > NOW()
    RETURNING registration_id
  `;
  return rows.length > 0;
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

export async function getRegistrationsDueForReminder(): Promise<RegistrationDueForReminder[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.id,
      r.email,
      r.status_token,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      e.title       AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.time::text  AS event_time,
      e.location    AS event_location
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.status = 'approved'
      AND r.reminder_sent_at IS NULL
      AND r.email IS NOT NULL
      AND e.date = CURRENT_DATE + INTERVAL '1 day'
      AND e.status != 'cancelled'
  `;
  return rows as RegistrationDueForReminder[];
}

export async function sendReminderEmail(registrationId: number): Promise<void> {
  const sql = getSQL();

  const rows = await sql`
    SELECT
      r.id,
      r.email,
      r.status,
      r.reminder_sent_at,
      r.status_token,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      COALESCE((SELECT rp.last_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS last_name,
      e.title       AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.time::text  AS event_time,
      e.location    AS event_location,
      e.status      AS event_status
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ${registrationId}
  `;

  const reg = rows[0] as {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    status: string;
    reminder_sent_at: string | null;
    status_token: string;
    event_title: string;
    event_date: string;
    event_time: string;
    event_location: string;
    event_status: string;
  } | undefined;

  if (!reg) throw new Error(`Registration ${registrationId} nicht gefunden`);
  if (!reg.email) throw new Error(`Registration ${registrationId} hat keine E-Mail-Adresse`);
  if (reg.status !== "approved") throw new Error(`Registration ${registrationId} ist nicht approved`);
  if (reg.reminder_sent_at) throw new Error(`Reminder für Registration ${registrationId} wurde bereits gesendet`);
  if (reg.event_status === "cancelled") throw new Error(`Event für Registration ${registrationId} wurde abgesagt`);

  const eventEndsAt = new Date(`${reg.event_date}T23:59:59`);
  const cancellationToken = await generateCancellationToken(registrationId, eventEndsAt);

  const { sendEventReminderEmail } = await import("../email");
  await sendEventReminderEmail({
    to: reg.email,
    firstName: reg.first_name,
    eventTitle: reg.event_title,
    eventDate: reg.event_date,
    eventTime: reg.event_time,
    eventLocation: reg.event_location,
    statusToken: reg.status_token,
    cancellationToken,
  });

  await sql`
    UPDATE registrations
    SET reminder_sent_at = NOW()
    WHERE id = ${registrationId}
  `;
}
