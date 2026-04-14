import { getAllRegistrations, getEventRegistrations } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationWithEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("event_id");

    let registrations: RegistrationWithEvent[];
    if (eventId) {
      registrations = await getEventRegistrations(Number(eventId));
    } else {
      registrations = await getAllRegistrations();
    }

    const header = "Vorname;Nachname;E-Mail;Telefon;Begleitpersonen;Event;Event-Datum;Kategorie;Anmeldedatum;Walk-in;Bemerkung";
    const rows = registrations.map((r) =>
      [
        r.first_name,
        r.last_name,
        r.email || "",
        r.phone || "",
        r.guests,
        r.event_title,
        r.event_date,
        r.event_category,
        r.created_at,
        r.is_walk_in ? "Ja" : "Nein",
        r.notes || "",
      ].join(";")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="anmeldungen${eventId ? `_event_${eventId}` : ""}.csv"`,
      },
    });
  } catch (error) {
    console.error("Fehler beim CSV-Export:", error);
    return NextResponse.json({ error: "Export fehlgeschlagen." }, { status: 500 });
  }
}
