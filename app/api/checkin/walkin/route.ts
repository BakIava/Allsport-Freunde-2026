import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createWalkInRegistration } from "@/lib/db";
import type { PersonName } from "@/lib/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      event_id: number;
      persons: PersonName[];
      email: string;
      phone?: string;
      notes?: string;
    };

    const { event_id, persons, email, phone, notes } = body;

    if (!event_id || typeof event_id !== "number") {
      return NextResponse.json({ error: "event_id fehlt oder ungültig." }, { status: 400 });
    }

    if (!email?.trim()) {
      return NextResponse.json({ error: "E-Mail-Adresse ist erforderlich." }, { status: 400 });
    }

    const emailTrimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }

    if (!Array.isArray(persons) || persons.length === 0) {
      return NextResponse.json({ error: "Mindestens eine Person ist erforderlich." }, { status: 400 });
    }

    for (const p of persons) {
      if (!p.firstName?.trim() || !p.lastName?.trim()) {
        return NextResponse.json({ error: "Alle Personen benötigen Vor- und Nachname." }, { status: 400 });
      }
    }

    const adminName = user.email ?? "admin";
    const result = await createWalkInRegistration({
      event_id,
      persons: persons.map((p) => ({ firstName: p.firstName.trim(), lastName: p.lastName.trim() })),
      email: emailTrimmed,
      phone: phone?.trim() || null,
      notes: notes?.trim() || null,
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
