import { publishEvent, unpublishEvent, getEventFull } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

/** POST /api/admin/events/[id]/publish → publish a draft event */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();

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

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: "PUBLISH",
      entityType: "EVENT",
      entityId: eventId,
      entityLabel: existing.title,
      changes: { old: { status: "draft" }, new: { status: "published" } },
      ipAddress,
    });

    return NextResponse.json({ message: "Event veröffentlicht!" });
  } catch (error) {
    console.error("Fehler beim Veröffentlichen:", error);
    return NextResponse.json({ error: "Event konnte nicht veröffentlicht werden." }, { status: 500 });
  }
}

/** DELETE /api/admin/events/[id]/publish → unpublish (back to draft), blocked if registrations exist */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();

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

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: "UNPUBLISH",
      entityType: "EVENT",
      entityId: eventId,
      entityLabel: existing.title,
      changes: { old: { status: "published" }, new: { status: "draft" } },
      ipAddress,
    });

    return NextResponse.json({ message: "Event zurück in Planung gesetzt." });
  } catch (error) {
    console.error("Fehler beim Zurückziehen:", error);
    return NextResponse.json({ error: "Event konnte nicht zurückgezogen werden." }, { status: 500 });
  }
}
