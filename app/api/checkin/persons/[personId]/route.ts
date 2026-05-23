import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markPersonCheckedIn, undoPersonCheckin } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { personId } = await params;
  const checkedInBy = session.user?.name ?? "admin";

  try {
    const result = await markPersonCheckedIn(personId, checkedInBy);
    if (!result) {
      return NextResponse.json(
        { error: "Person nicht gefunden oder bereits eingecheckt." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, registrationId: result.registrationId });
  } catch (error) {
    console.error("Fehler beim Person-Check-In:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { personId } = await params;

  try {
    const result = await undoPersonCheckin(personId);
    if (!result) {
      return NextResponse.json(
        { error: "Person nicht gefunden." },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, registrationId: result.registrationId });
  } catch (error) {
    console.error("Fehler beim Person-Check-In-Undo:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
