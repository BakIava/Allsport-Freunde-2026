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
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved'), 0)::int AS approved_count,
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved' AND r.checked_in_at IS NOT NULL), 0)::int AS checked_in_count,
        COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
        COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
        (COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved'), 0) * COALESCE(e.entry_price, 0))::float8 AS expected_revenue,
        (COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved' AND r.checked_in_at IS NOT NULL), 0) * COALESCE(e.entry_price, 0))::float8 AS actual_revenue
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id AND r.status = 'approved'
      WHERE e.date >= ${today}
      GROUP BY e.id
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
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved'), 0)::int AS approved_count,
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved' AND r.checked_in_at IS NOT NULL), 0)::int AS checked_in_count,
        COALESCE((SELECT SUM(ec.amount)::float8 FROM event_costs ec WHERE ec.event_id = e.id), 0)::float8 AS total_costs,
        COALESCE((SELECT SUM(ed.amount)::float8 FROM event_donations ed WHERE ed.event_id = e.id), 0)::float8 AS total_donations,
        (COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved'), 0) * COALESCE(e.entry_price, 0))::float8 AS expected_revenue,
        (COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved' AND r.checked_in_at IS NOT NULL), 0) * COALESCE(e.entry_price, 0))::float8 AS actual_revenue
      FROM events e
      LEFT JOIN registrations r ON r.event_id = e.id AND r.status = 'approved'
      WHERE e.date < ${today}
      GROUP BY e.id
      ORDER BY e.date DESC, e.time DESC
      LIMIT 10
    `;

    const pastEvents = pastRows;

    return NextResponse.json({ today: todayEvents, upcoming: upcomingEvents, past: pastEvents });
  } catch (error) {
    console.error("Fehler beim Laden der Check-In Events:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
