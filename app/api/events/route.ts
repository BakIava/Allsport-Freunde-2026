import { getEvents } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    return NextResponse.json(
      { error: "Events konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
