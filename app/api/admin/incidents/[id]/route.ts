import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteIncident, logAudit } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const incidentId = Number(id);
  if (isNaN(incidentId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const deleted = await deleteIncident(incidentId);
    if (!deleted) {
      return NextResponse.json({ error: "Vorfall nicht gefunden." }, { status: 404 });
    }
    await logAudit(user.email ?? null, "delete", "incident", incidentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Löschen des Vorfalls:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
