import {
  getEvent,
  findRegistration,
  getRegistrationCount,
} from "@/lib/db";
import { getRemainingSlots, createRegistrationPersons } from "@/lib/db/persons";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { getSQL } from "@/lib/db/utils";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationRequest = await request.json();
    const { event_id, email, phone, persons } = body;

    if (!event_id || !email?.trim() || !phone?.trim()) {
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

    if (!Array.isArray(persons) || persons.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Person ist erforderlich." },
        { status: 400 }
      );
    }

    for (const p of persons) {
      if (!p.firstName?.trim() || !p.lastName?.trim()) {
        return NextResponse.json(
          { error: "Vor- und Nachname sind für alle Personen erforderlich." },
          { status: 400 }
        );
      }
    }

    const event = await getEvent(event_id);

    if (!event) {
      return NextResponse.json(
        { error: "Das Event wurde nicht gefunden." },
        { status: 404 }
      );
    }

    if (event.status !== "published") {
      return NextResponse.json(
        { error: "Das Event ist nicht zur Anmeldung freigegeben." },
        { status: 403 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prüfe ob eine aktive Anmeldung dieser E-Mail existiert
    const existing = await findRegistration(event_id, normalizedEmail);
    if (existing && existing.status !== "cancelled") {
      return NextResponse.json(
        { error: "Du bist bereits für dieses Event angemeldet." },
        { status: 409 }
      );
    }

    // Verbleibende Plätze nach max_per_email prüfen
    const maxPerEmail = event.max_per_email ?? 5;
    const remainingForEmail = await getRemainingSlots(event_id, normalizedEmail, maxPerEmail);

    if (persons.length > remainingForEmail) {
      return NextResponse.json(
        {
          error: remainingForEmail <= 0
            ? `Du hast das Limit von ${maxPerEmail} Personen pro E-Mail-Adresse für dieses Event erreicht.`
            : `Du kannst für diese E-Mail-Adresse noch ${remainingForEmail} Person${remainingForEmail !== 1 ? "en" : ""} anmelden.`,
        },
        { status: 409 }
      );
    }

    // Gesamtkapazität prüfen
    const currentCount = await getRegistrationCount(event_id);
    const spotsAvailable = event.max_participants - currentCount;

    if (persons.length > spotsAvailable) {
      return NextResponse.json(
        {
          error:
            spotsAvailable <= 0
              ? "Dieses Event ist leider ausgebucht."
              : `Es sind nur noch ${spotsAvailable} Plätze verfügbar.`,
        },
        { status: 409 }
      );
    }

    const statusToken = randomUUID();
    const sql = getSQL();

    // Erste Person als Fallback für NOT NULL Spalten (Rückwärtskompatibilität)
    const firstPerson = persons[0];
    const firstName = firstPerson.firstName.trim();
    const lastName = firstPerson.lastName.trim();

    // Anmeldung erstellen
    let registrationId: number;

    if (existing && existing.status === "cancelled") {
      // Stornierte Anmeldung reaktivieren
      const rows = await sql`
        UPDATE registrations SET
          first_name = ${firstName},
          last_name = ${lastName},
          phone = ${phone.trim()},
          status = 'pending',
          status_token = ${statusToken},
          status_changed_at = NOW(),
          status_note = NULL
        WHERE id = ${existing.id}
        RETURNING id
      `;
      registrationId = (rows[0] as { id: number }).id;

      // Alte Personen löschen
      await sql`DELETE FROM registration_persons WHERE registration_id = ${registrationId}`;
    } else {
      const rows = await sql`
        INSERT INTO registrations (event_id, first_name, last_name, email, phone, status, status_token)
        VALUES (${event_id}, ${firstName}, ${lastName}, ${normalizedEmail}, ${phone.trim()}, 'pending', ${statusToken})
        RETURNING id
      `;
      registrationId = (rows[0] as { id: number }).id;
    }

    // Personen anlegen
    await createRegistrationPersons(registrationId, persons);

    // Fire-and-forget E-Mail
    sendRegistrationReceivedEmail({
      to: normalizedEmail,
      firstName: persons[0].firstName.trim(),
      persons: persons.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      statusToken,
    });

    return NextResponse.json(
      {
        message: "Anmeldung erfolgreich!",
        event_title: event.title,
        status_token: statusToken,
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
