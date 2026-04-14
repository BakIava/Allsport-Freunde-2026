import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getEventCosts,
  createEventCost,
  getEventFull,
  logAudit,
} from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id } = await params;
  const eventId = Number(id);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });

  try {
    const costs = await getEventCosts(eventId);
    return NextResponse.json(costs);
  } catch {
    return NextResponse.json({ error: "Fehler beim Laden der Kostenpositionen." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id } = await params;
  const eventId = Number(id);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });

  const event = await getEventFull(eventId);
  if (!event) return NextResponse.json({ error: "Event nicht gefunden." }, { status: 404 });

  try {
    const body = await request.json();
    const description = String(body.description ?? "").trim();
    const amount = parseFloat(body.amount);

    if (!description) return NextResponse.json({ error: "Beschreibung ist erforderlich." }, { status: 400 });
    if (isNaN(amount) || amount < 0) return NextResponse.json({ error: "Ungültiger Betrag." }, { status: 400 });

    const cost = await createEventCost(eventId, description, amount);

    await logAudit(session.user?.name ?? null, "CREATE_EVENT_COST", "EVENT_COST", cost.id, {
      event_id: eventId,
      description,
      amount,
    });

    return NextResponse.json(cost, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Fehler beim Erstellen der Kostenposition." }, { status: 500 });
  }
}
