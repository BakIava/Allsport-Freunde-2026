import { getAllTemplates, createTemplate } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import type { EventTemplateInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const templates = await getAllTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    console.error("Fehler beim Laden der Vorlagen:", error);
    return NextResponse.json({ error: "Vorlagen konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentUser();

  try {
    const body: EventTemplateInput = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Bitte gib einen Vorlagennamen an." }, { status: 400 });
    }
    if (!body.title?.trim() || !body.category || !body.location?.trim() || !body.price?.trim() || !body.max_participants) {
      return NextResponse.json({ error: "Bitte fülle alle Pflichtfelder aus." }, { status: 400 });
    }
    if (!["fussball", "fitness", "schwimmen"].includes(body.category)) {
      return NextResponse.json({ error: "Ungültige Kategorie." }, { status: 400 });
    }
    if (body.max_participants < 1) {
      return NextResponse.json({ error: "Mindestens 1 Teilnehmerplatz erforderlich." }, { status: 400 });
    }

    const result = await createTemplate({
      name: body.name.trim(),
      title: body.title.trim(),
      category: body.category,
      description: (body.description || "").trim(),
      location: body.location.trim(),
      price: body.price.trim(),
      dress_code: (body.dress_code || "").trim(),
      max_participants: body.max_participants,
      images: Array.isArray(body.images) ? body.images : [],
    });

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: "CREATE",
      entityType: "TEMPLATE",
      entityId: result.id,
      entityLabel: body.name.trim(),
      changes: { new: { name: body.name.trim(), title: body.title.trim(), category: body.category } },
      ipAddress,
    });

    return NextResponse.json({ message: "Vorlage erstellt!", id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Fehler beim Erstellen der Vorlage:", error);
    return NextResponse.json({ error: "Vorlage konnte nicht erstellt werden." }, { status: 500 });
  }
}
