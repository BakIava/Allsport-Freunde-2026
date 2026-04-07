import { getAuditLogs } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { EntityType, AuditAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entityType") as EntityType | null;
  const entityId = searchParams.get("entityId") ? Number(searchParams.get("entityId")) : undefined;
  const userId = searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined;
  const action = searchParams.get("action") as AuditAction | null;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);
  const offset = Number(searchParams.get("offset") || "0");

  // VIEWER+ can see entity logs; only ADMIN sees user action logs
  if (entityType === "USER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const logs = await getAuditLogs({
      entityType: entityType ?? undefined,
      entityId,
      userId,
      action: action ?? undefined,
      from,
      to,
      limit,
      offset,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Fehler beim Laden der Audit-Logs:", error);
    return NextResponse.json({ error: "Logs konnten nicht geladen werden." }, { status: 500 });
  }
}
