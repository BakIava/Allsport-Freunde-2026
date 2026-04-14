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
  EventTemplate,
  EventTemplateInput,
  EventImage,
  EventImageInput,
  CheckinParticipant,
  CheckinStatusResponse,
  ContactInquiry,
  ContactInquiryWithEvent,
  ContactInquiryDetail,
  InquiryMessage,
  ContactFormInput,
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
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.parking_location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('id', i.id, 'event_id', i.event_id, 'url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM event_images i WHERE i.event_id = e.id), '[]') AS images
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
      r.qr_code, r.checked_in_at,
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
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.parking_location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('id', i.id, 'event_id', i.event_id, 'url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM event_images i WHERE i.event_id = e.id), '[]') AS images
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
      e.id, e.title, e.category, e.description, TO_CHAR(e.date, 'YYYY-MM-DD') AS date, e.time::text AS time, e.location, e.parking_location, e.price, e.dress_code, e.max_participants, e.status, e.cancellation_reason, e.published_at, e.created_at,
      COALESCE(SUM(CASE WHEN r.status = 'approved' THEN r.guests + 1 ELSE 0 END), 0)::int AS current_participants,
      COALESCE(SUM(CASE WHEN r.status = 'pending' THEN r.guests + 1 ELSE 0 END), 0)::int AS pending_participants,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('id', i.id, 'event_id', i.event_id, 'url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM event_images i WHERE i.event_id = e.id), '[]') AS images
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.id = ${id}
    GROUP BY e.id
  `;
  return (rows[0] as EventWithRegistrations) ?? null;
}

export async function setEventImages(eventId: number, images: EventImageInput[]): Promise<void> {
  if (!isPostgresConfigured()) {
    const { setLocalEventImages } = await import("./local-data");
    setLocalEventImages(eventId, images);
    return;
  }
  const sql = getSQL();
  await sql`DELETE FROM event_images WHERE event_id = ${eventId}`;
  for (const img of images) {
    await sql`INSERT INTO event_images (event_id, url, alt_text, position) VALUES (${eventId}, ${img.url}, ${img.alt_text}, ${img.position})`;
  }
}

export async function getEventImages(eventId: number): Promise<EventImage[]> {
  if (!isPostgresConfigured()) {
    const { setLocalEventImages: _ } = await import("./local-data");
    // use the images attached to the event
    const { getLocalEventFull } = await import("./local-data");
    const event = getLocalEventFull(eventId);
    return event?.images ?? [];
  }
  const sql = getSQL();
  const rows = await sql`SELECT * FROM event_images WHERE event_id = ${eventId} ORDER BY position`;
  return rows as EventImage[];
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
    INSERT INTO events (title, category, description, date, time, location, parking_location, price, dress_code, max_participants, status, published_at)
    VALUES (${data.title}, ${data.category}, ${data.description}, ${data.date}, ${data.time}, ${data.location}, ${data.parking_location ?? null}, ${data.price}, ${data.dress_code}, ${data.max_participants}, ${status}, ${publishedAt})
    RETURNING id
  `;
  const { id } = rows[0] as { id: number };
  if (data.images?.length) {
    await setEventImages(id, data.images);
  }
  return { id };
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
      parking_location = ${data.parking_location ?? null},
      price = ${data.price},
      dress_code = ${data.dress_code},
      max_participants = ${data.max_participants}
    WHERE id = ${id}
  `;
  if (data.images !== undefined) {
    await setEventImages(id, data.images);
  }
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
  await sql`DELETE FROM event_images WHERE event_id = ${id}`;
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

// ─── Templates ───────────────────────────────────────────

async function setTemplateImages(templateId: number, images: EventImageInput[]): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM template_images WHERE template_id = ${templateId}`;
  for (const img of images) {
    await sql`INSERT INTO template_images (template_id, url, alt_text, position) VALUES (${templateId}, ${img.url}, ${img.alt_text}, ${img.position})`;
  }
}

export async function getAllTemplates(): Promise<EventTemplate[]> {
  if (!isPostgresConfigured()) {
    const { getLocalAllTemplates } = await import("./local-data");
    return getLocalAllTemplates();
  }
  const sql = getSQL();
  const rows = await sql`
    SELECT t.*,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM template_images i WHERE i.template_id = t.id), '[]') AS images
    FROM event_templates t
    ORDER BY t.last_used_at DESC NULLS LAST, t.created_at DESC
  `;
  return rows as EventTemplate[];
}

export async function getTemplate(id: number): Promise<EventTemplate | null> {
  if (!isPostgresConfigured()) {
    const { getLocalTemplate } = await import("./local-data");
    return getLocalTemplate(id);
  }
  const sql = getSQL();
  const rows = await sql`
    SELECT t.*,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM template_images i WHERE i.template_id = t.id), '[]') AS images
    FROM event_templates t
    WHERE t.id = ${id}
  `;
  return (rows[0] as EventTemplate) ?? null;
}

export async function createTemplate(data: EventTemplateInput): Promise<{ id: number }> {
  if (!isPostgresConfigured()) {
    const { createLocalTemplate } = await import("./local-data");
    return createLocalTemplate(data);
  }
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO event_templates (name, title, category, description, location, price, dress_code, max_participants)
    VALUES (${data.name}, ${data.title}, ${data.category}, ${data.description}, ${data.location}, ${data.price}, ${data.dress_code}, ${data.max_participants})
    RETURNING id
  `;
  const { id } = rows[0] as { id: number };
  if (data.images?.length) await setTemplateImages(id, data.images);
  return { id };
}

export async function updateTemplate(id: number, data: EventTemplateInput): Promise<void> {
  if (!isPostgresConfigured()) {
    const { updateLocalTemplate } = await import("./local-data");
    updateLocalTemplate(id, data);
    return;
  }
  const sql = getSQL();
  await sql`
    UPDATE event_templates SET
      name = ${data.name},
      title = ${data.title},
      category = ${data.category},
      description = ${data.description},
      location = ${data.location},
      price = ${data.price},
      dress_code = ${data.dress_code},
      max_participants = ${data.max_participants}
    WHERE id = ${id}
  `;
  if (data.images !== undefined) await setTemplateImages(id, data.images);
}

export async function deleteTemplate(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { deleteLocalTemplate } = await import("./local-data");
    deleteLocalTemplate(id);
    return;
  }
  const sql = getSQL();
  // template_images has ON DELETE CASCADE, so this is enough:
  await sql`DELETE FROM event_templates WHERE id = ${id}`;
}

export async function touchTemplate(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { touchLocalTemplate } = await import("./local-data");
    touchLocalTemplate(id);
    return;
  }
  const sql = getSQL();
  await sql`UPDATE event_templates SET last_used_at = NOW() WHERE id = ${id}`;
}

// ─── Check-In ────────────────────────────────────────────

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
): Promise<RegistrationWithEvent | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT r.*, e.title AS event_title, TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date, e.category AS event_category
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.qr_token = ${qrToken}
  `;
  return (rows[0] as RegistrationWithEvent) ?? null;
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
    SELECT id, first_name, last_name, email, phone, guests, checked_in_at, checked_in_by, is_walk_in, notes
    FROM registrations
    WHERE event_id = ${eventId} AND status = 'approved'
    ORDER BY last_name ASC, first_name ASC
  `;

  const participants = rows as CheckinParticipant[];
  // Each registration = 1 Hauptperson + guests Begleiter
  const total = participants.reduce((sum, p) => sum + p.guests + 1, 0);
  const checkedIn = participants
    .filter((p) => p.checked_in_at !== null)
    .reduce((sum, p) => sum + p.guests + 1, 0);

  return {
    total,
    checked_in: checkedIn,
    missing: total - checkedIn,
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
    const { createLocalWalkInRegistration } = await import("./local-data");
    return createLocalWalkInRegistration(data);
  }

  // Duplicate-email check (only when email is provided)
  if (data.email) {
    const existing = await findRegistration(data.event_id, data.email);
    if (existing) return { id: existing.id, alreadyExists: true };
  }

  const sql = getSQL();
  const statusToken = crypto.randomUUID();
  const guestCount = data.guests ?? 0;
  const rows = await sql`
    INSERT INTO registrations
      (event_id, first_name, last_name, email, phone, guests, status, status_token,
       is_walk_in, notes, checked_in_at, checked_in_by, status_changed_at)
    VALUES
      (${data.event_id}, ${data.first_name}, ${data.last_name}, ${data.email},
       ${data.phone}, ${guestCount}, 'approved', ${statusToken},
       TRUE, ${data.notes}, ${data.checked_in_by ? sql`NOW()` : sql`NULL`}, ${data.checked_in_by ?? null}, NOW())
    RETURNING id
  `;
  return { id: (rows[0] as { id: number }).id, alreadyExists: false };
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

// ─── Contact Inquiries ───────────────────────────────────

export async function createContactInquiry(
  data: ContactFormInput & { conversation_token: string }
): Promise<{ id: number; conversation_token: string }> {
  const sql = getSQL();
  // If user consented, keep data for 100 years; otherwise auto-delete after 90 days
  const deleteAt = data.consent_to_store
    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql`
    INSERT INTO contact_inquiries
      (first_name, last_name, email, whatsapp_number, message, event_id,
       conversation_token, consent_to_store, delete_at)
    VALUES (
      ${data.first_name ?? null},
      ${data.last_name ?? null},
      ${data.email},
      ${data.whatsapp_number ?? null},
      ${data.message},
      ${data.event_id ?? null},
      ${data.conversation_token},
      ${data.consent_to_store ?? false},
      ${deleteAt}
    )
    RETURNING id, conversation_token
  `;
  const row = rows[0] as { id: number; conversation_token: string };

  // Store the initial user message in the thread
  await sql`
    INSERT INTO inquiry_messages (inquiry_id, sender, message)
    VALUES (${row.id}, 'user', ${data.message})
  `;

  return row;
}

export async function getContactInquiries(): Promise<ContactInquiryWithEvent[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.delete_at > NOW()
    ORDER BY ci.created_at DESC
  `;
  return rows as ContactInquiryWithEvent[];
}

export async function getContactInquiry(id: number): Promise<ContactInquiryDetail | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.id = ${id} AND ci.delete_at > NOW()
  `;
  if (!rows[0]) return null;
  const inquiry = rows[0] as ContactInquiryWithEvent;

  const msgRows = await sql`
    SELECT * FROM inquiry_messages
    WHERE inquiry_id = ${id}
    ORDER BY sent_at ASC
  `;

  return { ...inquiry, messages: msgRows as InquiryMessage[] };
}

export async function getContactInquiryByToken(token: string): Promise<ContactInquiryDetail | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.conversation_token = ${token} AND ci.delete_at > NOW()
  `;
  if (!rows[0]) return null;
  const inquiry = rows[0] as ContactInquiryWithEvent;

  const msgRows = await sql`
    SELECT * FROM inquiry_messages
    WHERE inquiry_id = ${inquiry.id}
    ORDER BY sent_at ASC
  `;

  return { ...inquiry, messages: msgRows as InquiryMessage[] };
}

export async function addInquiryMessage(
  inquiryId: number,
  sender: "user" | "admin",
  message: string
): Promise<InquiryMessage> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO inquiry_messages (inquiry_id, sender, message)
    VALUES (${inquiryId}, ${sender}, ${message})
    RETURNING *
  `;
  return rows[0] as InquiryMessage;
}

export async function updateInquiryStatus(
  id: number,
  status: "open" | "answered" | "resolved"
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE contact_inquiries
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getOpenInquiryCount(): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM contact_inquiries
    WHERE status = 'open' AND delete_at > NOW()
  `;
  return (rows[0] as { count: number }).count;
}
