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

    // Fetch events that have at least one approved registration
    const rows = await sql`
      SELECT
        e.id,
        e.title,
        e.category,
        TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
        e.time::text AS time,
        e.location,
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved'), 0)::int AS approved_count,
        COALESCE(SUM(r.guests + 1) FILTER (WHERE r.status = 'approved' AND r.checked_in_at IS NOT NULL), 0)::int AS checked_in_count
      FROM events e
      JOIN registrations r ON r.event_id = e.id AND r.status = 'approved'
      WHERE e.date >= ${today}
      GROUP BY e.id
      HAVING COUNT(r.id) FILTER (WHERE r.status = 'approved') > 0
      ORDER BY e.date ASC, e.time ASC
    `;

    const todayEvents = rows.filter((r) => r.date === today);
    const upcomingEvents = rows.filter((r) => r.date > today);

    return NextResponse.json({ today: todayEvents, upcoming: upcomingEvents });
  } catch (error) {
    console.error("Fehler beim Laden der Check-In Events:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
