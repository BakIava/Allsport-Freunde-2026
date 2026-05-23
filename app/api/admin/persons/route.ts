import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSQL } from "@/lib/db/utils";

export interface AdminPersonRow {
  person_id: string;
  registration_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  event_title: string;
  event_date: string;
  event_category: string;
  checked_in_at: string | null;
  cancelled_at: string | null;
  registration_status: string;
  is_walk_in: boolean;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const eventId = searchParams.get("event_id");

  try {
    const sql = getSQL();
    const rows = eventId
      ? await sql`
          SELECT
            rp.id AS person_id,
            rp.registration_id,
            rp.first_name,
            rp.last_name,
            rp.checked_in_at,
            rp.cancelled_at,
            rp.created_at,
            r.email,
            r.status AS registration_status,
            r.is_walk_in,
            e.title AS event_title,
            TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
            e.category AS event_category
          FROM registration_persons rp
          JOIN registrations r ON rp.registration_id = r.id
          JOIN events e ON r.event_id = e.id
          WHERE r.event_id = ${eventId}
          ORDER BY rp.cancelled_at NULLS FIRST, rp.last_name ASC, rp.first_name ASC
        `
      : await sql`
          SELECT
            rp.id AS person_id,
            rp.registration_id,
            rp.first_name,
            rp.last_name,
            rp.checked_in_at,
            rp.cancelled_at,
            rp.created_at,
            r.email,
            r.status AS registration_status,
            r.is_walk_in,
            e.title AS event_title,
            TO_CHAR(e.date, 'YYYY-MM-DD') AS event_date,
            e.category AS event_category
          FROM registration_persons rp
          JOIN registrations r ON rp.registration_id = r.id
          JOIN events e ON r.event_id = e.id
          ORDER BY e.date DESC, rp.cancelled_at NULLS FIRST, rp.last_name ASC, rp.first_name ASC
        `;

    return NextResponse.json(rows as AdminPersonRow[]);
  } catch (error) {
    console.error("Fehler beim Laden der Personen:", error);
    return NextResponse.json({ error: "Fehler beim Laden." }, { status: 500 });
  }
}
