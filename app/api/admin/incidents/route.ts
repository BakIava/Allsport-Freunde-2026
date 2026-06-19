import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getIncidentsForName, createIncident } from "@/lib/db";
import { logAudit } from "@/lib/db";
import type { PersonIncidentInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const firstName = request.nextUrl.searchParams.get("first_name")?.trim() ?? "";
  const lastName = request.nextUrl.searchParams.get("last_name")?.trim() ?? "";
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Vor- und Nachname erforderlich." }, { status: 400 });
  }

  try {
    const incidents = await getIncidentsForName(firstName, lastName);
    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Fehler beim Laden der Vorfälle:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: PersonIncidentInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const firstName = (body.first_name ?? "").trim();
  const lastName = (body.last_name ?? "").trim();
  const description = (body.description ?? "").trim();
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Vor- und Nachname erforderlich." }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Bitte beschreibe das Ereignis." }, { status: 400 });
  }

  try {
    const incident = await createIncident({
      first_name: firstName,
      last_name: lastName,
      description,
      incident_date: body.incident_date?.trim() || null,
      created_by: user.email ?? "admin",
    });
    await logAudit(user.email ?? null, "create", "incident", incident.id, {
      name: `${firstName} ${lastName}`,
    });
    return NextResponse.json({ incident }, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Speichern des Vorfalls:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
