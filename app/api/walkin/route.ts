import { NextRequest, NextResponse } from "next/server";
import { verifyWalkInToken } from "@/lib/checkin";
import { createWalkInRegistration, getEvent } from "@/lib/db";

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
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
      notes?: string;
      guests: number;
      privacy_accepted: boolean;
      terms_accepted: boolean;
    };

    const {
      eventId,
      token,
      first_name,
      last_name,
      email,
      phone,
      notes,
      guests,
    } = body;

    // Token validation
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

    // Required field validation
    if (!first_name?.trim()) {
      return NextResponse.json({ error: "Vorname ist erforderlich." }, { status: 400 });
    }
    if (!last_name?.trim()) {
      return NextResponse.json({ error: "Nachname ist erforderlich." }, { status: 400 });
    }

    const emailTrimmed = email?.trim() || null;
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }

    if (typeof guests !== "number" || guests < 0 || guests > 10 || !Number.isInteger(guests)) {
      return NextResponse.json(
        { error: "Ungültige Anzahl Begleitpersonen (0–10)." },
        { status: 400 }
      );
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

    // Verify event is still active
    const event = await getEvent(eventId);
    if (!event || event.status !== "published") {
      return NextResponse.json(
        { error: "Dieses Event ist nicht mehr verfügbar." },
        { status: 404 }
      );
    }

    // Create walk-in registration (already checked-in)
    const result = await createWalkInRegistration({
      event_id: eventId,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: emailTrimmed,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      guests,
      checked_in_by: null, // No admin, it's a self-check-in
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
