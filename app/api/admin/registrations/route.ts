import { getAllRegistrations } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const registrations = await getAllRegistrations();
    return NextResponse.json(registrations);
  } catch (error) {
    console.error("Fehler beim Laden der Anmeldungen:", error);
    return NextResponse.json({ error: "Anmeldungen konnten nicht geladen werden." }, { status: 500 });
  }
}
