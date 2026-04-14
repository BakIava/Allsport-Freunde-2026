import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEventDonations, createDonation, logAudit } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID" }, { status: 400 });

  try {
    const donations = await getEventDonations(eventId);
    return NextResponse.json(donations);
  } catch (err) {
    console.error("Fehler beim Laden der Spenden:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const eventId = parseInt(id, 10);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID" }, { status: 400 });

  let body: { registration_id?: number | null; donor_name: string; amount: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const { registration_id = null, donor_name, amount, note = null } = body;

  if (!donor_name?.trim()) {
    return NextResponse.json({ error: "Name des Spenders ist erforderlich" }, { status: 400 });
  }
  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Betrag muss größer als 0 sein" }, { status: 400 });
  }

  try {
    const adminUsername = (session.user as { name?: string })?.name ?? null;
    const donation = await createDonation(
      eventId,
      registration_id ?? null,
      donor_name.trim(),
      amount,
      note?.trim() || null,
      adminUsername
    );
    await logAudit(adminUsername, "CREATE_DONATION", "event_donation", donation.id, {
      event_id: eventId,
      donor_name: donation.donor_name,
      amount: donation.amount,
      registration_id: donation.registration_id,
    });
    return NextResponse.json(donation, { status: 201 });
  } catch (err) {
    console.error("Fehler beim Erstellen der Spende:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
