import { cancelRegistrationByToken } from "@/lib/db";
import { sendRegistrationCancelledEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const info = await cancelRegistrationByToken(token);

    if (!info) {
      return NextResponse.json(
        { error: "Anmeldung nicht gefunden oder kann nicht storniert werden." },
        { status: 404 }
      );
    }

    sendRegistrationCancelledEmail({
      to: info.email,
      firstName: info.first_name,
      lastName: info.last_name,
      eventTitle: info.event_title,
      eventDate: info.event_date,
      eventTime: info.event_time,
      eventLocation: info.event_location,
      statusToken: token,
    });

    return NextResponse.json({ message: "Anmeldung erfolgreich storniert." });
  } catch (error) {
    console.error("Fehler beim Stornieren der Anmeldung:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
