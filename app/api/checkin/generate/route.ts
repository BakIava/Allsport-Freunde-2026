import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRegistrationWithEvent, getEvent, saveQRCode } from "@/lib/db";
import { generateCheckinToken, generateQRCode } from "@/lib/checkin";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { registrationId } = await request.json() as { registrationId: number };

    if (!registrationId || typeof registrationId !== "number") {
      return NextResponse.json({ error: "registrationId fehlt." }, { status: 400 });
    }

    const registration = await getRegistrationWithEvent(registrationId);
    if (!registration) {
      return NextResponse.json({ error: "Anmeldung nicht gefunden." }, { status: 404 });
    }

    if (registration.status !== "approved") {
      return NextResponse.json({ error: "Nur genehmigte Anmeldungen erhalten einen QR-Code." }, { status: 400 });
    }

    const event = await getEvent(registration.event_id);
    if (!event) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }

    const token = generateCheckinToken(
      { eventId: event.id, participantId: registration.id, registrationId: registration.id },
      event.date,
      event.time
    );

    const qrCode = await generateQRCode(token);

    await saveQRCode(registrationId, qrCode, token);

    return NextResponse.json({ qrCode, token });
  } catch (error) {
    console.error("Fehler bei QR-Code-Generierung:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
