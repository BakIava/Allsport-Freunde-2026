import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";
import type { EventWithRegistrations } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const events = db
      .prepare(
        `
      SELECT
        e.*,
        COALESCE(SUM(r.guests + 1), 0) as current_participants
      FROM events e
      LEFT JOIN registrations r ON e.id = r.event_id
      WHERE e.date >= date('now')
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
    `
      )
      .all() as EventWithRegistrations[];

    return NextResponse.json(events);
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    return NextResponse.json(
      { error: "Events konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
