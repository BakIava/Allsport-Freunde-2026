import { getEventFull, updateEvent, deleteEvent } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import type { EventCreateInput } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await getEventFull(Number(id));
    if (!event) {
      return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (error) {
    console.error("Fehler beim Laden des Events:", error);
    return NextResponse.json({ error: "Event konnte nicht geladen werden." }, { status: 500 });
  }
}

export async function PUT(
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

    const body: EventCreateInput = await request.json();

    if (!body.title?.trim() || !body.category || !body.date || !body.time || !body.location?.trim() || !body.price?.trim() || !body.max_participants) {
      return NextResponse.json({ error: "Bitte fülle alle Pflichtfelder aus." }, { status: 400 });
    }

    const oldValues = {
      title: existing.title,
      category: existing.category,
      date: existing.date,
      time: existing.time,
      location: existing.location,
      price: existing.price,
      max_participants: existing.max_participants,
    };

    await updateEvent(eventId, {
      title: body.title.trim(),
      category: body.category,
      description: (body.description || "").trim(),
      date: body.date,
      time: body.time,
      location: body.location.trim(),
      price: body.price.trim(),
      dress_code: (body.dress_code || "").trim(),
      max_participants: body.max_participants,
      images: Array.isArray(body.images) ? body.images : undefined,
    });

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: "UPDATE",
      entityType: "EVENT",
      entityId: eventId,
      entityLabel: existing.title,
      changes: {
        old: oldValues,
        new: {
          title: body.title.trim(),
          category: body.category,
          date: body.date,
          time: body.time,
          location: body.location.trim(),
          price: body.price.trim(),
          max_participants: body.max_participants,
        },
      },
      ipAddress,
    });

    return NextResponse.json({ message: "Event aktualisiert!" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren:", error);
    return NextResponse.json({ error: "Event konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

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

    await deleteEvent(eventId);

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: "DELETE",
      entityType: "EVENT",
      entityId: eventId,
      entityLabel: existing.title,
      changes: { old: { title: existing.title, status: existing.status, date: existing.date } },
      ipAddress,
    });

    return NextResponse.json({ message: "Event gelöscht!" });
  } catch (error) {
    console.error("Fehler beim Löschen:", error);
    return NextResponse.json({ error: "Event konnte nicht gelöscht werden." }, { status: 500 });
  }
}
