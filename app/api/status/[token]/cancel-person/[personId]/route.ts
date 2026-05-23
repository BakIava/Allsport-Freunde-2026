import { cancelPersonByToken } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; personId: string }> }
) {
  try {
    const { token, personId } = await params;
    const result = await cancelPersonByToken(token, personId);

    if (!result) {
      return NextResponse.json(
        { error: "Person nicht gefunden oder kann nicht storniert werden." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, allCancelled: result.allCancelled });
  } catch (error) {
    console.error("Fehler beim Stornieren der Person:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten." },
      { status: 500 }
    );
  }
}
