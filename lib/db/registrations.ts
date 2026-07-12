import { getSQL, isPostgresConfigured } from "./utils";
import type {
  RegistrationWithEvent,
  RegistrationDetail,
  RegistrationStatusInfo,
  RegistrationStatus,
  RegistrationPerson,
  EventPerson,
} from "../types";

/**
 * Number of spots that are effectively taken for an event: approved *and*
 * still-pending sign-ups. A pending sign-up already reserves a spot, so it
 * has to count towards "is the event full?" – otherwise the public occupancy
 * indicator and the waitlist confirmation e-mail would disagree. Kept in sync
 * with the same definition in `toPublicEvent`.
 */
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
    WHERE r.event_id = ${eventId} AND r.status IN ('approved', 'pending')
  `;
  return (rows[0] as { count: number }).count;
}

export async function findRegistration(
  eventId: number,
  email: string
): Promise<{ id: number; status: string; status_token: string | null } | null> {
  if (!isPostgresConfigured()) {
    const { findLocalRegistration } = await import("../local-data");
    const reg = findLocalRegistration(eventId, email);
    return reg ? { id: reg.id, status: reg.status, status_token: reg.status_token ?? null } : null;
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT id, status, status_token FROM registrations
    WHERE event_id = ${eventId} AND LOWER(email) = LOWER(${email})
    ORDER BY
      CASE status
        WHEN 'pending' THEN 0
        WHEN 'approved' THEN 1
        WHEN 'rejected' THEN 2
        WHEN 'cancelled' THEN 3
        ELSE 4
      END,
      id DESC
    LIMIT 1
  `;

  return (rows[0] as { id: number; status: string; status_token: string | null }) ?? null;
}

export async function getRemainingSlots(
  eventId: number,
  email: string,
  maxPerEmail: number
): Promise<number> {
  if (!isPostgresConfigured()) return maxPerEmail;

  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(rp.id)::int AS count
    FROM registrations r
    JOIN registration_persons rp ON rp.registration_id = r.id AND rp.cancelled_at IS NULL
    WHERE r.event_id = ${eventId}
      AND LOWER(r.email) = LOWER(${email})
      AND r.status NOT IN ('cancelled', 'rejected')
  `;
  const used = (rows[0] as { count: number }).count;
  return Math.max(0, maxPerEmail - used);
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
  if (!rows[0]) return null;

  const reg = rows[0] as RegistrationStatusInfo;
  const persons = await sql`
    SELECT id, registration_id, first_name, last_name, checked_in_at, cancelled_at, created_at
    FROM registration_persons
    WHERE registration_id = ${reg.id}
    ORDER BY created_at ASC
  `;
  reg.persons = persons as import("../types").RegistrationPerson[];
  return reg;
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
  await sql`
    UPDATE registration_persons SET cancelled_at = NOW()
    WHERE registration_id = (SELECT id FROM registrations WHERE status_token = ${token})
      AND cancelled_at IS NULL
  `;
  return getRegistrationByToken(token);
}

export async function cancelPersonByToken(
  token: string,
  personId: string
): Promise<{ ok: boolean; allCancelled: boolean } | null> {
  if (!isPostgresConfigured()) {
    return { ok: true, allCancelled: false };
  }

  const sql = getSQL();
  // Verify token belongs to this person's registration
  const check = await sql`
    SELECT r.id, r.status
    FROM registrations r
    JOIN registration_persons rp ON rp.registration_id = r.id
    WHERE r.status_token = ${token}
      AND rp.id = ${personId}
      AND r.status IN ('pending', 'approved')
      AND rp.cancelled_at IS NULL
  `;
  if (!check[0]) return null;

  const registrationId = (check[0] as { id: number }).id;

  await sql`
    UPDATE registration_persons SET cancelled_at = NOW()
    WHERE id = ${personId}
  `;

  // Check if all persons are now cancelled
  const remaining = await sql`
    SELECT COUNT(*)::int AS count FROM registration_persons
    WHERE registration_id = ${registrationId} AND cancelled_at IS NULL
  `;
  const allCancelled = (remaining[0] as { count: number }).count === 0;

  if (allCancelled) {
    await sql`
      UPDATE registrations SET status = 'cancelled', status_changed_at = NOW()
      WHERE id = ${registrationId}
    `;
  }

  return { ok: true, allCancelled };
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

export async function getEventPersons(eventId: number): Promise<EventPerson[]> {
  if (!isPostgresConfigured()) {
    const { getLocalEventPersons } = await import("../local-data");
    return getLocalEventPersons(eventId);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      rp.id AS person_id,
      rp.registration_id,
      rp.first_name,
      rp.last_name,
      rp.checked_in_at,
      rp.cancelled_at,
      rp.created_at,
      r.email,
      r.phone,
      r.status,
      r.is_walk_in
    FROM registration_persons rp
    JOIN registrations r ON r.id = rp.registration_id
    WHERE r.event_id = ${eventId}
    ORDER BY r.created_at ASC, rp.created_at ASC
  `;
  return rows as EventPerson[];
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
    const persons: RegistrationPerson[] = [
      {
        id: `local-${base.id}-0`,
        registration_id: base.id,
        first_name: base.first_name,
        last_name: base.last_name,
        checked_in_at: base.checked_in_at,
        cancelled_at: null,
        created_at: base.created_at,
      },
      ...Array.from({ length: Math.max(0, base.person_count - 1) }, (_, i) => ({
        id: `local-${base.id}-${i + 1}`,
        registration_id: base.id,
        first_name: "Begleitperson",
        last_name: `${i + 1}`,
        checked_in_at: null,
        cancelled_at: null,
        created_at: base.created_at,
      })),
    ];
    return { ...base, event_time: "", event_location: "", persons };
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
  if (!rows[0]) return null;

  const detail = rows[0] as RegistrationDetail;
  const persons = await sql`
    SELECT id, registration_id, first_name, last_name, checked_in_at, cancelled_at, created_at
    FROM registration_persons
    WHERE registration_id = ${id} AND cancelled_at IS NULL
    ORDER BY created_at ASC
  `;
  detail.persons = persons as RegistrationPerson[];
  return detail;
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

// ─── Survey Emails ────────────────────────────────────────

export interface RegistrationDueForSurvey {
  id: number;
  email: string;
}

export async function getRegistrationsDueForSurvey(): Promise<RegistrationDueForSurvey[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT r.id, r.email
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.status = 'approved'
      AND r.survey_sent_at IS NULL
      AND r.email IS NOT NULL
      AND e.survey_url IS NOT NULL
      AND e.survey_url != ''
      AND e.date < CURRENT_DATE
      AND e.date >= CURRENT_DATE - INTERVAL '30 days'
      AND e.status != 'cancelled'
  `;
  return rows as RegistrationDueForSurvey[];
}

export async function sendSurveyEmailForRegistration(registrationId: number): Promise<void> {
  const sql = getSQL();

  const rows = await sql`
    SELECT
      r.id,
      r.email,
      r.status,
      r.survey_sent_at,
      COALESCE((SELECT rp.first_name FROM registration_persons rp WHERE rp.registration_id = r.id ORDER BY rp.created_at LIMIT 1), '') AS first_name,
      e.title       AS event_title,
      TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
      e.survey_url  AS survey_url,
      e.status      AS event_status
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ${registrationId}
  `;

  const reg = rows[0] as {
    id: number;
    first_name: string;
    email: string | null;
    status: string;
    survey_sent_at: string | null;
    event_title: string;
    event_date: string;
    survey_url: string | null;
    event_status: string;
  } | undefined;

  if (!reg) throw new Error(`Registration ${registrationId} nicht gefunden`);
  if (!reg.email) throw new Error(`Registration ${registrationId} hat keine E-Mail-Adresse`);
  if (reg.status !== "approved") throw new Error(`Registration ${registrationId} ist nicht approved`);
  if (reg.survey_sent_at) throw new Error(`Survey-E-Mail für Registration ${registrationId} wurde bereits gesendet`);
  if (!reg.survey_url) throw new Error(`Kein Survey-URL für Event der Registration ${registrationId}`);
  if (reg.event_status === "cancelled") throw new Error(`Event für Registration ${registrationId} wurde abgesagt`);

  const { sendEventSurveyEmail } = await import("../email");
  await sendEventSurveyEmail({
    to: reg.email,
    firstName: reg.first_name,
    eventTitle: reg.event_title,
    eventDate: reg.event_date,
    surveyUrl: reg.survey_url,
  });

  await sql`
    UPDATE registrations
    SET survey_sent_at = NOW()
    WHERE id = ${registrationId}
  `;
}
