import { NextRequest, NextResponse } from "next/server";
import { cancelPerson } from "@/lib/db/persons";
import { getSQL } from "@/lib/db/utils";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; personId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { personId } = await params;

  try {
    const sql = getSQL();
    const rows = await sql`
      SELECT rp.id, rp.registration_id FROM registration_persons rp WHERE rp.id = ${personId}
    `;
    if (!rows[0]) {
      return NextResponse.json({ error: "Person nicht gefunden." }, { status: 404 });
    }

    await cancelPerson(personId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Stornieren der Person:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
