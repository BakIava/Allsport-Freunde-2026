import { deleteRegistration, getRegistrationDetail } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const registration = await getRegistrationDetail(Number(id));
    if (!registration) {
      return NextResponse.json({ error: "Anmeldung nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(registration);
  } catch (error) {
    console.error("Fehler beim Laden der Anmeldung:", error);
    return NextResponse.json({ error: "Anmeldung konnte nicht geladen werden." }, { status: 500 });
  }
}

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
