import { getEntityAuditLogs } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import type { EntityType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { entityType, entityId } = await params;

  if (entityType === "USER" && actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  try {
    const logs = await getEntityAuditLogs(entityType as EntityType, Number(entityId));
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Fehler beim Laden der Entity-Logs:", error);
    return NextResponse.json({ error: "Logs konnten nicht geladen werden." }, { status: 500 });
  }
}
