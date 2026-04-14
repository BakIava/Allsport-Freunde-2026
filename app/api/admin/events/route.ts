import { getAllEvents, createEvent } from "@/lib/db";
import { invalidateCache } from "@/lib/cache";
import { NextRequest, NextResponse } from "next/server";
import type { EventCreateInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    return NextResponse.json({ error: "Events konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EventCreateInput = await request.json();

    if (!body.title?.trim() || !body.category || !body.date || !body.time || !body.location?.trim() || !body.price?.trim() || !body.max_participants) {
      return NextResponse.json({ error: "Bitte fülle alle Pflichtfelder aus." }, { status: 400 });
    }

    if (!["fussball", "fitness", "schwimmen"].includes(body.category)) {
      return NextResponse.json({ error: "Ungültige Kategorie." }, { status: 400 });
    }

    if (body.max_participants < 1) {
      return NextResponse.json({ error: "Mindestens 1 Teilnehmerplatz erforderlich." }, { status: 400 });
    }

    const bodyAny = body as EventCreateInput & { publish?: boolean };
    const entryPrice = body.entry_price != null ? parseFloat(String(body.entry_price)) : null;
    const result = await createEvent({
      title: body.title.trim(),
      category: body.category,
      description: (body.description || "").trim(),
      date: body.date,
      time: body.time,
      location: body.location.trim(),
      parking_location: body.parking_location?.trim() || undefined,
      price: body.price.trim(),
      entry_price: entryPrice != null && !isNaN(entryPrice) ? entryPrice : null,
      dress_code: (body.dress_code || "").trim(),
      max_participants: body.max_participants,
      images: Array.isArray(body.images) ? body.images : [],
      publish: bodyAny.publish === true,
    });

    // Neues Event kann die öffentliche Liste verändern → Cache invalidieren
    invalidateCache("events:");
    return NextResponse.json({ message: "Event erstellt!", id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen des Events:", error);
    return NextResponse.json({ error: "Event konnte nicht erstellt werden." }, { status: 500 });
  }
}
