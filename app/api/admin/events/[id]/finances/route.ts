import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEventFinancials, getEventFull } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id } = await params;
  const eventId = Number(id);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });

  const event = await getEventFull(eventId);
  if (!event) return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });

  try {
    const financials = await getEventFinancials(eventId);
    return NextResponse.json(financials);
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden der Finanzdaten." }, { status: 500 });
  }
}
