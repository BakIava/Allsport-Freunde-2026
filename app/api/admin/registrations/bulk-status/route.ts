import {
  bulkUpdateRegistrationStatus,
  getRegistrationWithEvent,
  getEvent,
} from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import {
  sendRegistrationApprovedEmail,
  sendRegistrationRejectedEmail,
} from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import type { RegistrationStatus } from "@/lib/types";

export async function PATCH(request: NextRequest) {
  const actor = await getCurrentUser();

  try {
    const body = await request.json();
    const { ids, status, note } = body as {
      ids: number[];
      status: RegistrationStatus;
      note?: string;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Keine Anmeldungen ausgewählt." },
        { status: 400 }
      );
    }

    if (!["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Ungültiger Status." },
        { status: 400 }
      );
    }

    // Get registrations before update for email data
    const regsBefore = await Promise.all(
      ids.map((id) => getRegistrationWithEvent(id))
    );

    const results = await bulkUpdateRegistrationStatus(ids, status, note);

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    const auditAction = status === "approved" ? "APPROVE" : status === "rejected" ? "REJECT" : "UPDATE";

    // Fire-and-forget emails + audit logs
    for (const reg of regsBefore) {
      if (!reg) continue;
      const event = await getEvent(reg.event_id);
      if (!event) continue;

      const emailData = {
        to: reg.email,
        firstName: reg.first_name,
        lastName: reg.last_name,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.location,
        statusToken: reg.status_token,
      };

      if (status === "approved") {
        sendRegistrationApprovedEmail(emailData);
      } else if (status === "rejected") {
        sendRegistrationRejectedEmail({ ...emailData, note });
      }

      logAction({
        userId: actor?.id,
        userName: actor?.name,
        action: auditAction,
        entityType: "REGISTRATION",
        entityId: reg.id,
        entityLabel: `${reg.first_name} ${reg.last_name} – ${reg.event_title}`,
        changes: { old: { status: reg.status }, new: { status, note: note ?? null } },
        ipAddress,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Fehler bei Bulk-Statuswechsel:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
