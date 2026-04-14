import { cancelEvent } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { sendEventCancelledEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    const body = await request.json().catch(() => ({}));
    const reason: string | undefined = body.reason?.trim() || undefined;

    const result = await cancelEvent(eventId, reason);

    if (result.event === null) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }

    if (result.alreadyCancelled) {
      return NextResponse.json(
        { error: "Die Veranstaltung wurde bereits abgesagt." },
        { status: 409 }
      );
    }

    // Send cancellation emails to all participants (fire-and-forget per email)
    for (const reg of result.registrations) {
      sendEventCancelledEmail({
        to: reg.email,
        firstName: reg.first_name,
        lastName: reg.last_name,
        eventTitle: result.event.title,
        eventDate: result.event.date,
        eventTime: result.event.time,
        eventLocation: result.event.location,
        statusToken: reg.status_token,
        cancellationReason: reason,
      });
    }

    // Abgesagtes Event wird aus öffentlicher Liste entfernt → Cache invalidieren
    invalidateCache("events:");
    return NextResponse.json({
      message: "Veranstaltung erfolgreich abgesagt.",
      emailsSent: result.registrations.length,
    });
  } catch (error) {
    console.error("Fehler beim Absagen der Veranstaltung:", error);
    return NextResponse.json(
      { error: "Veranstaltung konnte nicht abgesagt werden." },
      { status: 500 }
    );
  }
}
