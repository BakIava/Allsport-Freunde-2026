import { neon } from "@neondatabase/serverless";
import type {
  EventWithRegistrations,
  AdminUser,
  AdminStats,
  EventCreateInput,
  RegistrationWithEvent,
  RegistrationStatusInfo,
  RegistrationStatus,
  Registration,
  CancelEventResult,
  PublishEventResult,
} from "./types";

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

function isPostgresConfigured(): boolean {
  return !!getDatabaseUrl();
}

function getSQL() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("Keine Datenbank-URL konfiguriert");
  return neon(url);
}

// ─── Public API ──────────────────────────────────────────

export async function getEvents(): Promise<EventWithRegistrations[]> {
  if (!isPostgresConfigured()) {
    const { getLocalEvents } = await import("./local-data");
    return getLocalEvents();
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.status = 'published' AND e.date >= CURRENT_DATE
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `;
  return rows as EventWithRegistrations[];
}

export async function getEvent(
  id: number
): Promise<{ id: number; max_participants: number; title: string; date: string; time: string; location: string; price: string; dress_code: string; category: string; status: string; cancellation_reason: string | null; published_at: string | null } | null> {
  if (!isPostgresConfigured()) {
    const { getLocalEvent } = await import("./local-data");
    const event = getLocalEvent(id);
    return event ?? null;
  }

  const sql = getSQL();
  const rows = await sql`SELECT id, max_participants, title, TO_CHAR(date, 'YYYY-MM-DD') AS date, time::text AS time, location, price, dress_code, category, status, cancellation_reason, published_at FROM events WHERE id = ${id}`;
  return (rows[0] as { id: number; max_participants: number; title: string; date: string; time: string; location: string; price: string; dress_code: string; category: string; status: string; cancellation_reason: string | null; published_at: string | null }) ?? null;
}

export async function getRegistrationCount(eventId: number): Promise<number> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationCount } = await import("./local-data");
    return getLocalRegistrationCount(eventId);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT COALESCE(SUM(guests + 1), 0)::int AS count
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'approved'
  `;
  return (rows[0] as { count: number }).count;
}

export async function findRegistration(
  eventId: number,
  email: string
): Promise<{ id: number } | null> {
  if (!isPostgresConfigured()) {
    const { findLocalRegistration } = await import("./local-data");
    const reg = findLocalRegistration(eventId, email);
    return reg ? { id: reg.id } : null;
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT id FROM registrations
    WHERE event_id = ${eventId} AND email = ${email}
  `;
  return (rows[0] as { id: number }) ?? null;
}

export async function createRegistration(data: {
  event_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  guests: number;
  status_token: string;
}): Promise<void> {
  if (!isPostgresConfigured()) {
    const { createLocalRegistration } = await import("./local-data");
    createLocalRegistration(data);
    return;
  }

  const sql = getSQL();
  await sql`
    INSERT INTO registrations (event_id, first_name, last_name, email, phone, guests, status, status_token)
    VALUES (${data.event_id}, ${data.first_name}, ${data.last_name}, ${data.email}, ${data.phone}, ${data.guests}, 'pending', ${data.status_token})
  `;
}

// ─── Status Page ─────────────────────────────────────────

export async function getRegistrationByToken(token: string): Promise<RegistrationStatusInfo | null> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationByToken } = await import("./local-data");
    return getLocalRegistrationByToken(token);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.id, r.first_name, r.last_name, r.email, r.guests,
      r.status, r.status_note, r.status_changed_at, r.created_at,
      e.title AS event_title, e.date AS event_date, e.time AS event_time,
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
    const { cancelLocalRegistrationByToken } = await import("./local-data");
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

// ─── Auth ────────────────────────────────────────────────

export async function getAdminUser(username: string): Promise<AdminUser | null> {
  if (!isPostgresConfigured()) {
    const { getLocalAdminUser } = await import("./local-data");
    return getLocalAdminUser(username);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT * FROM admin_users WHERE username = ${username}
  `;
  return (rows[0] as AdminUser) ?? null;
}

// ─── Admin: Stats ────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  if (!isPostgresConfigured()) {
    const { getLocalAdminStats } = await import("./local-data");
    return getLocalAdminStats();
  }

  const sql = getSQL();
  const totalEventsRows = await sql`SELECT COUNT(*)::int AS count FROM events`;
  const upcomingRows = await sql`SELECT COUNT(*)::int AS count FROM events WHERE date >= CURRENT_DATE`;
  const totalRegsRows = await sql`SELECT COALESCE(SUM(guests + 1), 0)::int AS count FROM registrations`;
  const pendingRows = await sql`SELECT COALESCE(SUM(guests + 1), 0)::int AS count FROM registrations WHERE status = 'pending'`;
  const utilRows = await sql`
    SELECT
      CASE WHEN SUM(e.max_participants) = 0 THEN 0
      ELSE ROUND((COALESCE(SUM(r.total), 0)::numeric / SUM(e.max_participants)::numeric) * 100)
      END AS avg
    FROM events e
    LEFT JOIN (
      SELECT event_id, SUM(guests + 1) AS total FROM registrations WHERE status = 'approved' GROUP BY event_id
    ) r ON e.id = r.event_id
    WHERE e.date >= CURRENT_DATE
  `;

  return {
    total_events: (totalEventsRows[0] as { count: number }).count,
    upcoming_events: (upcomingRows[0] as { count: number }).count,
    total_registrations: (totalRegsRows[0] as { count: number }).count,
    pending_registrations: (pendingRows[0] as { count: number }).count,
    avg_utilization: Number((utilRows[0] as { avg: string | number }).avg) || 0,
  };
}

// ─── Admin: Events ───────────────────────────────────────

export async function getAllEvents(): Promise<EventWithRegistrations[]> {
  if (!isPostgresConfigured()) {
    const { getLocalAllEvents } = await import("./local-data");
    return getLocalAllEvents();
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    GROUP BY e.id
    ORDER BY e.date DESC, e.time DESC
  `;
  return rows as EventWithRegistrations[];
}

export async function getEventFull(id: number): Promise<EventWithRegistrations | null> {
  if (!isPostgresConfigured()) {
    const { getLocalEventFull } = await import("./local-data");
    return getLocalEventFull(id);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.id = ${id}
    GROUP BY e.id
  `;
  return (rows[0] as EventWithRegistrations) ?? null;
}

export async function createEvent(data: EventCreateInput & { publish?: boolean }): Promise<{ id: number }> {
  if (!isPostgresConfigured()) {
    const { createLocalEvent } = await import("./local-data");
    return createLocalEvent(data);
  }

  const sql = getSQL();
  const status = data.publish ? "published" : "draft";
  const publishedAt = data.publish ? new Date().toISOString() : null;
  const rows = await sql`
    INSERT INTO events (title, category, description, date, time, location, price, dress_code, max_participants, status, published_at)
    VALUES (${data.title}, ${data.category}, ${data.description}, ${data.date}, ${data.time}, ${data.location}, ${data.price}, ${data.dress_code}, ${data.max_participants}, ${status}, ${publishedAt})
    RETURNING id
  `;
  return rows[0] as { id: number };
}

export async function publishEvent(id: number): Promise<PublishEventResult> {
  if (!isPostgresConfigured()) {
    const { publishLocalEvent } = await import("./local-data");
    return publishLocalEvent(id);
  }

  const sql = getSQL();
  const eventRows = await sql`SELECT id, status FROM events WHERE id = ${id}`;
  const event = eventRows[0] as { id: number; status: string } | undefined;
  if (!event) return { success: false };

  await sql`UPDATE events SET status = 'published', published_at = NOW() WHERE id = ${id}`;
  return { success: true };
}

export async function unpublishEvent(id: number): Promise<PublishEventResult> {
  if (!isPostgresConfigured()) {
    const { unpublishLocalEvent } = await import("./local-data");
    return unpublishLocalEvent(id);
  }

  const sql = getSQL();
  const countRows = await sql`SELECT COUNT(*)::int AS count FROM registrations WHERE event_id = ${id}`;
  const registrationCount = (countRows[0] as { count: number }).count;
  if (registrationCount > 0) return { success: false, registrationCount };

  await sql`UPDATE events SET status = 'draft', published_at = NULL WHERE id = ${id} AND status = 'published'`;
  return { success: true };
}

export async function updateEvent(id: number, data: EventCreateInput): Promise<void> {
  if (!isPostgresConfigured()) {
    const { updateLocalEvent } = await import("./local-data");
    updateLocalEvent(id, data);
    return;
  }

  const sql = getSQL();
  await sql`
    UPDATE events SET
      title = ${data.title},
      category = ${data.category},
      description = ${data.description},
      date = ${data.date},
      time = ${data.time},
      location = ${data.location},
      price = ${data.price},
      dress_code = ${data.dress_code},
      max_participants = ${data.max_participants}
    WHERE id = ${id}
  `;
}

export async function cancelEvent(id: number, reason?: string): Promise<CancelEventResult> {
  if (!isPostgresConfigured()) {
    const { cancelLocalEvent } = await import("./local-data");
    return cancelLocalEvent(id, reason);
  }

  const sql = getSQL();
  const eventRows = await sql`SELECT id, title, TO_CHAR(date, 'YYYY-MM-DD') AS date, time::text AS time, location, status FROM events WHERE id = ${id}`;
  const event = eventRows[0] as { id: number; title: string; date: string; time: string; location: string; status: string } | undefined;

  if (!event) return { alreadyCancelled: false, event: null, registrations: [] };
  if (event.status === "cancelled") return { alreadyCancelled: true, event, registrations: [] };

  await sql`
    UPDATE events SET
      status = 'cancelled',
      cancellation_reason = ${reason ?? null}
    WHERE id = ${id}
  `;

  const regRows = await sql`
    SELECT email, first_name, last_name, status_token FROM registrations WHERE event_id = ${id}
  `;

  return {
    alreadyCancelled: false,
    event: { title: event.title, date: event.date, time: event.time, location: event.location },
    registrations: regRows as Pick<Registration, "email" | "first_name" | "last_name" | "status_token">[],
  };
}

export async function deleteEvent(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { deleteLocalEvent } = await import("./local-data");
    deleteLocalEvent(id);
    return;
  }

  const sql = getSQL();
  await sql`DELETE FROM registrations WHERE event_id = ${id}`;
  await sql`DELETE FROM events WHERE id = ${id}`;
}

// ─── Admin: Registrations ────────────────────────────────

export async function getAllRegistrations(): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { getLocalAllRegistrations } = await import("./local-data");
    return getLocalAllRegistrations();
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.*,
      e.title AS event_title,
      e.date AS event_date,
      e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    ORDER BY r.created_at DESC
  `;
  return rows as RegistrationWithEvent[];
}

export async function getEventRegistrations(eventId: number): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { getLocalEventRegistrations } = await import("./local-data");
    return getLocalEventRegistrations(eventId);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT
      r.*,
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
    const { deleteLocalRegistration } = await import("./local-data");
    deleteLocalRegistration(id);
    return;
  }

  const sql = getSQL();
  await sql`DELETE FROM registrations WHERE id = ${id}`;
}

// ─── Admin: Status Changes ──────────────────────────────

export async function updateRegistrationStatus(
  id: number,
  status: RegistrationStatus,
  note?: string
): Promise<RegistrationWithEvent | null> {
  if (!isPostgresConfigured()) {
    const { updateLocalRegistrationStatus } = await import("./local-data");
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
    SELECT r.*, e.title AS event_title, TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date, e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ${id}
  `;
  return (rows[0] as RegistrationWithEvent) ?? null;
}

export async function getRegistrationWithEvent(id: number): Promise<RegistrationWithEvent | null> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationWithEvent } = await import("./local-data");
    return getLocalRegistrationWithEvent(id);
  }

  const sql = getSQL();
  const rows = await sql`
    SELECT r.*, e.title AS event_title, TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date, e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.id = ${id}
  `;
  return (rows[0] as RegistrationWithEvent) ?? null;
}

export async function bulkUpdateRegistrationStatus(
  ids: number[],
  status: RegistrationStatus,
  note?: string
): Promise<RegistrationWithEvent[]> {
  if (!isPostgresConfigured()) {
    const { bulkUpdateLocalRegistrationStatus } = await import("./local-data");
    return bulkUpdateLocalRegistrationStatus(ids, status, note);
  }

  const results: RegistrationWithEvent[] = [];
  for (const id of ids) {
    const result = await updateRegistrationStatus(id, status, note);
    if (result) results.push(result);
  }
  return results;
}
