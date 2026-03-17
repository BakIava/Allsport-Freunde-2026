import { deleteRegistration } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteRegistration(Number(id));
    return NextResponse.json({ message: "Anmeldung gelöscht!" });
  } catch (error) {
    console.error("Fehler beim Löschen der Anmeldung:", error);
    return NextResponse.json({ error: "Anmeldung konnte nicht gelöscht werden." }, { status: 500 });
  }
}
