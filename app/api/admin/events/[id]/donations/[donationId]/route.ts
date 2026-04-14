import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDonationById, deleteDonation, logAudit } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; donationId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, donationId } = await params;
  const eventId = parseInt(id, 10);
  const dId = parseInt(donationId, 10);
  if (isNaN(eventId) || isNaN(dId)) {
    return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
  }

  try {
    const existing = await getDonationById(dId);
    if (!existing || existing.event_id !== eventId) {
      return NextResponse.json({ error: "Spende nicht gefunden" }, { status: 404 });
    }

    await deleteDonation(dId);

    const adminUsername = (session.user as { name?: string })?.name ?? null;
    await logAudit(adminUsername, "DELETE_DONATION", "event_donation", dId, {
      event_id: eventId,
      donor_name: existing.donor_name,
      amount: existing.amount,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Fehler beim Löschen der Spende:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
