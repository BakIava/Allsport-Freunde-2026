import {
  getEvent,
  getRegistrationCount,
  findRegistration,
  createRegistration,
} from "@/lib/db";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { randomUUID } from "crypto";
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

    // Check if event exists
    const event = await getEvent(event_id);

    if (!event) {
      return NextResponse.json(
        { error: "Das Event wurde nicht gefunden." },
        { status: 404 }
      );
    }

    // Check for duplicate registration
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await findRegistration(event_id, normalizedEmail);

    if (existing) {
      return NextResponse.json(
        { error: "Du bist bereits für dieses Event angemeldet." },
        { status: 409 }
      );
    }

    // Check available spots
    const currentCount = await getRegistrationCount(event_id);
    const spotsNeeded = 1 + guests;
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

    // Create registration with status token
    const statusToken = randomUUID();
    await createRegistration({
      event_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      guests,
      status_token: statusToken,
    });

    // Fire-and-forget email
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
