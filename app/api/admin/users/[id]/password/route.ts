import { getAdminUserById, resetAdminUserPassword } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const { id } = await params;
    const userId = Number(id);

    const existing = await getAdminUserById(userId);
    if (!existing) return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });

    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Passwort muss mindestens 6 Zeichen lang sein." }, { status: 400 });
    }

    const passwordHash = hashSync(password, 10);
    await resetAdminUserPassword(userId, passwordHash);

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor.id,
      userName: actor.name,
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: userId,
      entityLabel: existing.username,
      ipAddress,
    });

    return NextResponse.json({ message: "Passwort zurückgesetzt." });
  } catch (error) {
    console.error("Fehler beim Passwort-Reset:", error);
    return NextResponse.json({ error: "Passwort konnte nicht zurückgesetzt werden." }, { status: 500 });
  }
}
