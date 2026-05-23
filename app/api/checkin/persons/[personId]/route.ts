import { NextRequest, NextResponse } from "next/server";
import { checkInPerson, undoPersonCheckin } from "@/lib/db/persons";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { personId } = await params;

  try {
    const body = await request.json() as { action?: "checkin" | "undo" };
    const action = body.action ?? "checkin";

    if (action === "undo") {
      await undoPersonCheckin(personId);
      return NextResponse.json({ success: true });
    }

    const result = await checkInPerson(personId, session.user?.name ?? "admin");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
    console.error("Fehler beim Person-Check-In:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
