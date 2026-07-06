import { NextRequest, NextResponse } from "next/server";
import { verifyWalkInToken } from "@/lib/checkin";
import { createWalkInRegistration, getEvent } from "@/lib/db";
import type { PersonName } from "@/lib/types";

// Rate limiter: 10 self-service registrations per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte eine Minute." },
      { status: 429 }
    );
  }

  try {
    const body = (await request.json()) as {
      eventId: number;
      token: string;
      persons: PersonName[];
      email?: string;
      phone?: string;
      notes?: string;
      privacy_accepted: boolean;
      terms_accepted: boolean;
    };

    const { eventId, token, persons, email, phone, notes } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }
    const tokenPayload = verifyWalkInToken(token);
    if (!tokenPayload) {
      return NextResponse.json(
        { error: "Ungültiger oder abgelaufener QR-Code." },
        { status: 400 }
      );
    }
    if (tokenPayload.eventId !== eventId) {
      return NextResponse.json(
        { error: "Token passt nicht zu diesem Event." },
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
          { error: "Alle Personen benötigen Vor- und Nachname." },
          { status: 400 }
        );
      }
    }

    const emailTrimmed = email?.trim() || null;
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }

    if (!body.privacy_accepted) {
      return NextResponse.json(
        { error: "Bitte akzeptiere die Datenschutzerklärung." },
        { status: 400 }
      );
    }
    if (!body.terms_accepted) {
      return NextResponse.json(
        { error: "Bitte akzeptiere die Teilnahmebedingungen." },
        { status: 400 }
      );
    }

    const event = await getEvent(eventId);
    if (!event || event.status !== "published") {
      return NextResponse.json(
        { error: "Dieses Event ist nicht mehr verfügbar." },
        { status: 404 }
      );
    }

    const maxPersons = event.max_per_email ?? 5;
    if (persons.length > maxPersons) {
      return NextResponse.json(
        { error: `Maximal ${maxPersons} ${maxPersons === 1 ? "Person" : "Personen"} pro Anmeldung erlaubt.` },
        { status: 400 }
      );
    }

    const result = await createWalkInRegistration({
      event_id: eventId,
      persons: persons.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
      email: emailTrimmed,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      checked_in_by: null,
    });

    if (result.alreadyExists) {
      return NextResponse.json(
        { error: "Du bist bereits für dieses Event registriert." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler bei Walk-in Self-Service Registrierung:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
