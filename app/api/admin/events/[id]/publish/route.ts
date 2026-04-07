import { publishEvent, unpublishEvent, getEventFull } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/admin/events/[id]/publish → publish a draft event */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    const existing = await getEventFull(eventId);
    if (!existing) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }
    if (existing.status === "published") {
      return NextResponse.json({ error: "Das Event ist bereits veröffentlicht." }, { status: 409 });
    }
    if (existing.status === "cancelled") {
      return NextResponse.json({ error: "Ein abgesagtes Event kann nicht veröffentlicht werden." }, { status: 409 });
    }

    const result = await publishEvent(eventId);
    if (!result.success) {
      return NextResponse.json({ error: "Veröffentlichung fehlgeschlagen." }, { status: 500 });
    }
    return NextResponse.json({ message: "Event veröffentlicht!" });
  } catch (error) {
    console.error("Fehler beim Veröffentlichen:", error);
    return NextResponse.json({ error: "Event konnte nicht veröffentlicht werden." }, { status: 500 });
  }
}

/** DELETE /api/admin/events/[id]/publish → unpublish (back to draft), blocked if registrations exist */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = Number(id);

    const existing = await getEventFull(eventId);
    if (!existing) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }
    if (existing.status !== "published") {
      return NextResponse.json({ error: "Nur veröffentlichte Events können zurückgezogen werden." }, { status: 409 });
    }

    const result = await unpublishEvent(eventId);
    if (!result.success) {
      return NextResponse.json(
        {
          error: `Dieses Event hat bereits ${result.registrationCount} Anmeldung(en) und kann nicht zurückgezogen werden.`,
          registrationCount: result.registrationCount,
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Event zurück in Planung gesetzt." });
  } catch (error) {
    console.error("Fehler beim Zurückziehen:", error);
    return NextResponse.json({ error: "Event konnte nicht zurückgezogen werden." }, { status: 500 });
  }
}
