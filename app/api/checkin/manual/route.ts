import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { manualCheckin } from "@/lib/db";

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

    const result = await manualCheckin(registrationId, session.user?.name ?? "admin");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ein Fehler ist aufgetreten.";
    console.error("Fehler beim manuellen Check-In:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
