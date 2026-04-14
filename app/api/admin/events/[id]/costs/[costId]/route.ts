import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  updateEventCost,
  deleteEventCost,
  getEventCostById,
  logAudit,
} from "@/lib/db";

type Params = { params: Promise<{ id: string; costId: string }> };

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id, costId } = await params;
  const eventId = Number(id);
  const cId = Number(costId);
  if (isNaN(eventId) || isNaN(cId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  const existing = await getEventCostById(cId);
  if (!existing || existing.event_id !== eventId) {
    return NextResponse.json({ error: "Kostenposition nicht gefunden." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const description = String(body.description ?? "").trim();
    const amount = parseFloat(body.amount);

    if (!description) return NextResponse.json({ error: "Beschreibung ist erforderlich." }, { status: 400 });
    if (isNaN(amount) || amount < 0) return NextResponse.json({ error: "Ungültiger Betrag." }, { status: 400 });

    const updated = await updateEventCost(cId, description, amount);

    await logAudit(session.user?.name ?? null, "UPDATE_EVENT_COST", "EVENT_COST", cId, {
      event_id: eventId,
      description,
      amount,
      previous_description: existing.description,
      previous_amount: existing.amount,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Fehler beim Aktualisieren der Kostenposition." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id, costId } = await params;
  const eventId = Number(id);
  const cId = Number(costId);
  if (isNaN(eventId) || isNaN(cId)) return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });

  const existing = await getEventCostById(cId);
  if (!existing || existing.event_id !== eventId) {
    return NextResponse.json({ error: "Kostenposition nicht gefunden." }, { status: 404 });
  }

  try {
    await deleteEventCost(cId);

    await logAudit(session.user?.name ?? null, "DELETE_EVENT_COST", "EVENT_COST", cId, {
      event_id: eventId,
      description: existing.description,
      amount: existing.amount,
    });

    return NextResponse.json({ message: "Kostenposition gelöscht." });
  } catch {
    return NextResponse.json({ error: "Fehler beim Löschen der Kostenposition." }, { status: 500 });
  }
}
