import { getEventPersons } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const persons = await getEventPersons(Number(id));
    return NextResponse.json(persons);
  } catch (error) {
    console.error("Fehler beim Laden der Personen:", error);
    return NextResponse.json({ error: "Personen konnten nicht geladen werden." }, { status: 500 });
  }
}
