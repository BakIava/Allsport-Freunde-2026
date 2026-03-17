import { sql } from "@vercel/postgres";
import type { EventWithRegistrations } from "./types";

function isPostgresConfigured(): boolean {
  return !!process.env.POSTGRES_URL;
}

export async function getEvents(): Promise<EventWithRegistrations[]> {
  if (!isPostgresConfigured()) {
    const { getLocalEvents } = await import("./local-data");
    return getLocalEvents();
  }

  const { rows } = await sql`
    SELECT
      e.*,
      COALESCE(SUM(r.guests + 1), 0)::int AS current_participants
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id
    WHERE e.date >= CURRENT_DATE
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `;
  return rows as EventWithRegistrations[];
}

export async function getEvent(
  id: number
): Promise<{ id: number; max_participants: number; title: string } | null> {
  if (!isPostgresConfigured()) {
    const { getLocalEvent } = await import("./local-data");
    const event = getLocalEvent(id);
    return event ?? null;
  }

  const { rows } = await sql`SELECT * FROM events WHERE id = ${id}`;
  return (rows[0] as { id: number; max_participants: number; title: string }) ?? null;
}

export async function getRegistrationCount(eventId: number): Promise<number> {
  if (!isPostgresConfigured()) {
    const { getLocalRegistrationCount } = await import("./local-data");
    return getLocalRegistrationCount(eventId);
  }

  const { rows } = await sql`
    SELECT COALESCE(SUM(guests + 1), 0)::int AS count
    FROM registrations
    WHERE event_id = ${eventId}
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

  const { rows } = await sql`
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
}): Promise<void> {
  if (!isPostgresConfigured()) {
    const { createLocalRegistration } = await import("./local-data");
    createLocalRegistration(data);
    return;
  }

  await sql`
    INSERT INTO registrations (event_id, first_name, last_name, email, phone, guests)
    VALUES (${data.event_id}, ${data.first_name}, ${data.last_name}, ${data.email}, ${data.phone}, ${data.guests})
  `;
}
