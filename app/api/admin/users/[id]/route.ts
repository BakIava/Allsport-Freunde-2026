import { getAdminUserById, updateAdminUser, getAdminUserCountByRole } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import type { UserRole, UserStatus } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["ADMIN", "EVENT_MANAGER", "CASHIER", "VIEWER"];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }
  const { id } = await params;
  const user = await getAdminUserById(Number(id));
  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  return NextResponse.json(user);
}

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
    const { name, email, role, status } = body as {
      name?: string;
      email?: string | null;
      role?: UserRole;
      status?: UserStatus;
    };

    if (role && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Ungültige Rolle." }, { status: 400 });
    }

    // Prevent removing the last active ADMIN
    if (
      (role && role !== "ADMIN" && existing.role === "ADMIN") ||
      (status === "INACTIVE" && existing.role === "ADMIN")
    ) {
      const adminCount = await getAdminUserCountByRole("ADMIN");
      if (adminCount <= 1 && (userId === actor.id || existing.role === "ADMIN")) {
        return NextResponse.json(
          { error: "Es muss mindestens ein aktiver Administrator verbleiben." },
          { status: 409 }
        );
      }
    }

    const oldValues: Record<string, unknown> = {
      name: existing.name,
      email: existing.email,
      role: existing.role,
      status: existing.status,
    };

    await updateAdminUser(userId, {
      name: name?.trim(),
      email: email === null ? null : email?.trim() || undefined,
      role,
      status,
    });

    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    const newValues: Record<string, unknown> = {
      name: name?.trim() ?? existing.name,
      email: email !== undefined ? email : existing.email,
      role: role ?? existing.role,
      status: status ?? existing.status,
    };

    logAction({
      userId: actor.id,
      userName: actor.name,
      action: status === "INACTIVE" ? "DEACTIVATE" : status === "ACTIVE" ? "ACTIVATE" : "UPDATE",
      entityType: "USER",
      entityId: userId,
      entityLabel: existing.username,
      changes: { old: oldValues, new: newValues },
      ipAddress,
    });

    return NextResponse.json({ message: "Benutzer aktualisiert!" });
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Benutzers:", error);
    return NextResponse.json({ error: "Benutzer konnte nicht aktualisiert werden." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (userId === actor.id) {
    return NextResponse.json({ error: "Du kannst deinen eigenen Account nicht löschen." }, { status: 409 });
  }

  const existing = await getAdminUserById(userId);
  if (!existing) return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });

  // Deactivate instead of hard-delete (preserve audit trail)
  await updateAdminUser(userId, { status: "INACTIVE" });

  const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  logAction({
    userId: actor.id,
    userName: actor.name,
    action: "DEACTIVATE",
    entityType: "USER",
    entityId: userId,
    entityLabel: existing.username,
    ipAddress,
  });

  return NextResponse.json({ message: "Benutzer deaktiviert." });
}
