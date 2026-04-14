import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWalkInRegistration } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      event_id: number;
      first_name: string;
      last_name: string;
      email?: string;
      phone?: string;
      notes?: string;
      guests?: number;
    };

    const { event_id, first_name, last_name, email, phone, notes, guests } = body;

    if (!event_id || typeof event_id !== "number") {
      return NextResponse.json({ error: "event_id fehlt oder ungültig." }, { status: 400 });
    }
    if (!first_name?.trim()) {
      return NextResponse.json({ error: "Vorname ist erforderlich." }, { status: 400 });
    }
    if (!last_name?.trim()) {
      return NextResponse.json({ error: "Nachname ist erforderlich." }, { status: 400 });
    }

    // Basic email format validation if provided
    const emailTrimmed = email?.trim() || null;
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }

    const guestCount = typeof guests === "number" && guests >= 0 && guests <= 10 ? Math.floor(guests) : 0;
    const adminName = session.user?.name ?? "admin";
    const result = await createWalkInRegistration({
      event_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: emailTrimmed,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
      guests: guestCount,
      checked_in_by: adminName,
    });

    if (result.alreadyExists) {
      return NextResponse.json(
        { error: "Eine Registrierung mit dieser E-Mail-Adresse existiert bereits für dieses Event." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Fehler beim Walk-in Check-In:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
