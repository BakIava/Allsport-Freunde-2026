import { updateRegistrationStatus, getRegistrationWithEvent, getEvent, saveQRCode } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import {
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
} from "@/lib/email";
import { generateCheckinToken, generateQRCode } from "@/lib/checkin";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationStatus } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();

  try {
    const { id } = await params;
    const regId = Number(id);
    const body = await request.json();
    const { status, note } = body as { status: RegistrationStatus; note?: string };

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status." },
        { status: 400 }
      );
    }

    // Get registration before update for email data
    const regBefore = await getRegistrationWithEvent(regId);
    if (!regBefore) {
      return NextResponse.json(
        { error: "Anmeldung nicht gefunden." },
        { status: 404 }
      );
    }

    const result = await updateRegistrationStatus(regId, status, note);
    if (!result) {
      return NextResponse.json(
        { error: "Fehler beim Aktualisieren." },
        { status: 500 }
      );
    }

    // Get event details for email and QR code
    const event = await getEvent(regBefore.event_id);

    if (event) {
      let qrCodeBase64: string | undefined;

      // Generate QR code when approving
      if (status === "approved") {
        try {
          const token = generateCheckinToken(
            { eventId: event.id, participantId: regId, registrationId: regId },
            event.date,
            event.time
          );
          qrCodeBase64 = await generateQRCode(token);
          await saveQRCode(regId, qrCodeBase64, token);
        } catch (err) {
          console.error("Fehler bei QR-Code-Generierung:", err);
          // Non-fatal: continue with approval even if QR fails
        }
      }

      const emailData = {
        to: regBefore.email,
        firstName: regBefore.first_name,
        lastName: regBefore.last_name,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        statusToken: regBefore.status_token,
      };

      // Fire-and-forget email
      if (status === "approved") {
        sendRegistrationApprovedEmail({ ...emailData, qrCode: qrCodeBase64 });
      } else if (status === "rejected") {
        sendRegistrationRejectedEmail({ ...emailData, note });
      }
    }

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    const auditAction = status === "approved" ? "APPROVE" : status === "rejected" ? "REJECT" : "UPDATE";
    logAction({
      userId: actor?.id,
      userName: actor?.name,
      action: auditAction,
      entityType: "REGISTRATION",
      entityId: regId,
      entityLabel: `${regBefore.first_name} ${regBefore.last_name} – ${regBefore.event_title}`,
      changes: { old: { status: regBefore.status }, new: { status, note: note ?? null } },
      ipAddress,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fehler beim Statuswechsel:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
