import {
  getEvent,
  getRegistrationCount,
  findRegistration,
} from "@/lib/db";
import { getSQL } from "@/lib/db/utils";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body: RegistrationRequest = await request.json();
    const { event_id, first_name, last_name, email, phone, guests } = body;

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

    const guestCount = Math.max(0, Math.min(10, parseInt(String(guests)) || 0));

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
    const existing = await findRegistration(event_id, normalizedEmail);
    if (existing && existing.status !== "cancelled") {
      return NextResponse.json(
        { error: "Du bist bereits für dieses Event angemeldet." },
        { status: 409 }
      );
    }

    const spotsNeeded = 1 + guestCount;
    const currentCount = await getRegistrationCount(event_id);
    const spotsAvailable = event.max_participants - currentCount;

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

    // Persons: main registrant + placeholder companions
    const persons = [
      { firstName: first_name.trim(), lastName: last_name.trim() },
      ...Array.from({ length: guestCount }, () => ({
        firstName: "Begleitperson",
        lastName: "Begleitperson",
      })),
    ];

    const statusToken = randomUUID();
    const sql = getSQL();
    let registrationId: number;

    if (existing && existing.status === "cancelled") {
      // Reactivate cancelled registration
      const rows = await sql`
        UPDATE registrations SET
          phone = ${phone.trim()},
          status = 'pending',
          status_token = ${statusToken},
          status_changed_at = NOW(),
          status_note = NULL
        WHERE id = ${existing.id}
        RETURNING id
      `;
      registrationId = (rows[0] as { id: number }).id;
      await sql`DELETE FROM registration_persons WHERE registration_id = ${registrationId}`;
    } else {
      // New registration
      const rows = await sql`
        INSERT INTO registrations (event_id, email, phone, status, status_token)
        VALUES (${event_id}, ${normalizedEmail}, ${phone.trim()}, 'pending', ${statusToken})
        RETURNING id
      `;
      registrationId = (rows[0] as { id: number }).id;
    }

    // Insert all persons into registration_persons
    for (const p of persons) {
      await sql`
        INSERT INTO registration_persons (registration_id, first_name, last_name)
        VALUES (${registrationId}, ${p.firstName}, ${p.lastName})
      `;
    }

    sendRegistrationReceivedEmail({
      to: normalizedEmail,
      firstName: first_name.trim(),
      lastName: last_name.trim(),
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
