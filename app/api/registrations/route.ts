import { getDb } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationRequest = await request.json();
    const { event_id, first_name, last_name, email, phone, guests } = body;

    // Validation
    if (!event_id || !first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "Bitte fülle alle Pflichtfelder aus." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
    }

    if (guests < 0 || guests > 10) {
      return NextResponse.json(
        { error: "Die Anzahl der Begleitpersonen muss zwischen 0 und 10 liegen." },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check if event exists
    const event = db
      .prepare("SELECT * FROM events WHERE id = ?")
      .get(event_id) as { id: number; max_participants: number; title: string } | undefined;

    if (!event) {
      return NextResponse.json(
        { error: "Das Event wurde nicht gefunden." },
        { status: 404 }
      );
    }

    // Check for duplicate registration
    const existing = db
      .prepare("SELECT id FROM registrations WHERE event_id = ? AND email = ?")
      .get(event_id, email.toLowerCase().trim());

    if (existing) {
      return NextResponse.json(
        { error: "Du bist bereits für dieses Event angemeldet." },
        { status: 409 }
      );
    }

    // Check available spots
    const currentCount = db
      .prepare("SELECT COALESCE(SUM(guests + 1), 0) as count FROM registrations WHERE event_id = ?")
      .get(event_id) as { count: number };

    const spotsNeeded = 1 + guests;
    const spotsAvailable = event.max_participants - currentCount.count;

    if (spotsNeeded > spotsAvailable) {
      return NextResponse.json(
        {
          error:
            spotsAvailable === 0
              ? "Dieses Event ist leider ausgebucht."
              : `Es sind nur noch ${spotsAvailable} Plätze verfügbar.`,
        },
        { status: 409 }
      );
    }

    // Create registration
    db.prepare(
      `INSERT INTO registrations (event_id, first_name, last_name, email, phone, guests)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(event_id, first_name.trim(), last_name.trim(), email.toLowerCase().trim(), phone.trim(), guests);

    return NextResponse.json(
      {
        message: "Anmeldung erfolgreich!",
        event_title: event.title,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Fehler bei der Anmeldung:", error);
    return NextResponse.json(
      { error: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
