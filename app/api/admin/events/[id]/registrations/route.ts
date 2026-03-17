import { getEventRegistrations } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registrations = await getEventRegistrations(Number(id));
    return NextResponse.json(registrations);
  } catch (error) {
    console.error("Fehler beim Laden der Anmeldungen:", error);
    return NextResponse.json({ error: "Anmeldungen konnten nicht geladen werden." }, { status: 500 });
  }
}
