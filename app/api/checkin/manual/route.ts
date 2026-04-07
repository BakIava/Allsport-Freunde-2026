import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { manualCheckin, getRegistrationWithEvent } from "@/lib/db";
import { logAction } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { registrationId } = await request.json() as { registrationId: number };

    if (!registrationId || typeof registrationId !== "number") {
      return NextResponse.json({ error: "registrationId fehlt." }, { status: 400 });
    }

    const reg = await getRegistrationWithEvent(registrationId);
    const checkedInBy = session.user?.name ?? "admin";
    const result = await manualCheckin(registrationId, checkedInBy);

    if (!result.alreadyCheckedIn && reg) {
      const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
      logAction({
        userId: session.user?.dbId ?? null,
        userName: checkedInBy,
        action: "CHECK_IN",
        entityType: "CHECKIN",
        entityId: registrationId,
        entityLabel: `${reg.first_name} ${reg.last_name} (manuell)`,
        ipAddress,
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
    console.error("Fehler beim manuellen Check-In:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
