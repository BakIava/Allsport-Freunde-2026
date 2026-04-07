import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { undoCheckin } from "@/lib/db";

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

    await undoCheckin(registrationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Auschecken:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
