import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getSQL() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Keine Datenbank-URL konfiguriert");
  return neon(url);
}

// "Today" in the app's local timezone (Europe/Berlin default, configurable)
function todayString(): string {
  const tz = process.env.TZ || "Europe/Berlin";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

export async function GET() {
  try {
    const sql = getSQL();
    const today = todayString();

    // Fetch events that are today or upcoming, including finance summary
    const rows = await sql`
      SELECT
        e.id,
        e.title,
        e.category,
        TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
        e.time::text AS time,
        e.location,
        e.entry_price::float8 AS entry_price,
        COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved'), 0)::int AS approved_count,
        COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved' AND checked_in_at IS NOT NULL), 0)::int AS checked_in_count,
        COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
        COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
        (COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved'), 0) * COALESCE(e.entry_price, 0))::float8 AS expected_revenue,
        (COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved' AND checked_in_at IS NOT NULL), 0) * COALESCE(e.entry_price, 0))::float8 AS actual_revenue
      FROM events e
      WHERE e.status = 'published' AND e.date >= ${today}
      ORDER BY e.date ASC, e.time ASC
    `;

    const todayEvents = rows.filter((r) => r.date === today);
    const upcomingEvents = rows.filter((r) => r.date > today);

    // Fetch the last 10 past events
    const pastRows = await sql`
      SELECT
        e.id,
        e.title,
        e.category,
        TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
        e.time::text AS time,
        e.location,
        e.entry_price::float8 AS entry_price,
        COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved'), 0)::int AS approved_count,
        COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved' AND checked_in_at IS NOT NULL), 0)::int AS checked_in_count,
        COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
        COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
        (COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved'), 0) * COALESCE(e.entry_price, 0))::float8 AS expected_revenue,
        (COALESCE((SELECT SUM(guests + 1) FROM registrations WHERE event_id = e.id AND status = 'approved' AND checked_in_at IS NOT NULL), 0) * COALESCE(e.entry_price, 0))::float8 AS actual_revenue
      FROM events e
      WHERE e.status = 'published' AND e.date < ${today}
      ORDER BY e.date DESC, e.time DESC
      LIMIT 10
    `;

    return NextResponse.json({ today: todayEvents, upcoming: upcomingEvents, past: pastRows });
  } catch (error) {
    console.error("Fehler beim Laden der Check-In Events:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
