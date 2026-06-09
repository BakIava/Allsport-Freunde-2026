import {
  getEvent,
  findRegistration,
} from "@/lib/db";
import { getSQL } from "@/lib/db/utils";
import { sendRegistrationReceivedEmail } from "@/lib/email";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationRequest } from "@/lib/types";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/ratelimit";
import { validateHoneypot } from "@/lib/honeypot";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!checkRateLimit(ip, RATE_LIMITS.registration)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte einige Minuten." },
      { status: 429 }
    );
  }

  try {
    const body: RegistrationRequest & { _hp?: string; _ts?: string } = await request.json();

    if (!validateHoneypot({ _hp: body._hp, _ts: body._ts })) {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
    }

    const { event_id, email, phone, persons } = body;

    if (!event_id || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "Bitte fülle alle Pflichtfelder aus." },
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
          { error: "Vorname und Nachname sind für alle Personen erforderlich." },
          { status: 400 }
        );
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Bitte gib eine gültige E-Mail-Adresse ein." },
        { status: 400 }
      );
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
    const maxPerEmail = event.max_per_email ?? 5;

    const existing = await findRegistration(event_id, normalizedEmail);

    if (existing && existing.status === "pending") {
      return NextResponse.json(
        {
          error:
            "Deine Anmeldung wird gerade geprüft. Du erhältst eine E-Mail, sobald sie bestätigt ist.",
        },
        { status: 409 }
      );
    }

    if (existing && existing.status === "approved") {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits für das Event angemeldet." },
        { status: 409 }
      );
    }

    if (existing && existing.status === "rejected") {
      return NextResponse.json(
        { error: "Für diese E-Mail-Adresse ist keine Anmeldung möglich." },
        { status: 403 }
      );
    }

    // Hinweis: Es gibt bewusst keine harte Kapazitätsgrenze mehr. Ist ein Event
    // ausgebucht, landen weitere Anmeldungen als normale "pending"-Anmeldungen
    // auf der Warteliste und können vom Team angenommen werden – auch über die
    // Kapazität hinaus.

    if (persons.length > maxPerEmail) {
      return NextResponse.json(
        { error: `Maximal ${maxPerEmail} Personen pro E-Mail-Adresse erlaubt.` },
        { status: 400 }
      );
    }

    const sql = getSQL();
    const statusToken = randomUUID();
    let registrationId: number;

    if (existing && existing.status === "cancelled") {
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
      const rows = await sql`
        INSERT INTO registrations (event_id, email, phone, status, status_token)
        VALUES (${event_id}, ${normalizedEmail}, ${phone.trim()}, 'pending', ${statusToken})
        RETURNING id
      `;
      registrationId = (rows[0] as { id: number }).id;
    }

    for (const p of persons) {
      await sql`
        INSERT INTO registration_persons (registration_id, first_name, last_name)
        VALUES (${registrationId}, ${p.firstName.trim()}, ${p.lastName.trim()})
      `;
    }

    sendRegistrationReceivedEmail({
      to: normalizedEmail,
      firstName: persons[0].firstName.trim(),
      lastName: persons[0].lastName.trim(),
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventLocation: event.location,
      statusToken,
      persons: persons.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
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
