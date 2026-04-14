import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEvent } from "@/lib/db";
import {
  generateWalkInToken,
  generateWalkInQRCode,
  getWalkInUrl,
} from "@/lib/checkin";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const eventId = Number(request.nextUrl.searchParams.get("eventId"));
    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });
    }

    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }

    const token = generateWalkInToken(eventId, event.date, event.time);
    const qrCodeDataUrl = await generateWalkInQRCode(eventId, token);
    const walkInUrl = getWalkInUrl(eventId, token);

    return NextResponse.json({
      token,
      qrCodeDataUrl,
      walkInUrl,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
    });
  } catch (error) {
    console.error("Fehler beim Generieren des Walk-in QR-Codes:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
