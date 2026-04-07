import { getAllAdminUsers, createAdminUser } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { hashSync } from "bcryptjs";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_ROLES: UserRole[] = ["ADMIN", "EVENT_MANAGER", "CASHIER", "VIEWER"];

export async function GET() {
  try {
    const actor = await getCurrentUser();
    if (!actor || actor.role !== "ADMIN") {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }
    const users = await getAllAdminUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Fehler beim Laden der Benutzer:", error);
    return NextResponse.json({ error: "Benutzer konnten nicht geladen werden." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { username, password, name, email, role } = body as {
      username?: string;
      password?: string;
      name?: string;
      email?: string;
      role?: UserRole;
    };

    if (!username?.trim() || !password || !name?.trim() || !role) {
      return NextResponse.json({ error: "Benutzername, Passwort, Name und Rolle sind erforderlich." }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Passwort muss mindestens 6 Zeichen lang sein." }, { status: 400 });
    }

    const passwordHash = hashSync(password, 10);
    const result = await createAdminUser({
      username: username.trim(),
      passwordHash,
      name: name.trim(),
      email: email?.trim() || undefined,
      role,
      createdBy: actor.id,
    });

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    logAction({
      userId: actor.id,
      userName: actor.name,
      action: "CREATE",
      entityType: "USER",
      entityId: result.id,
      entityLabel: username.trim(),
      changes: { new: { username: username.trim(), role, name: name.trim() } },
      ipAddress,
    });

    return NextResponse.json({ message: "Benutzer angelegt!", id: result.id }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("admin_users_username_key")) {
      return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
    }
    console.error("Fehler beim Anlegen des Benutzers:", error);
    return NextResponse.json({ error: "Benutzer konnte nicht angelegt werden." }, { status: 500 });
  }
}
