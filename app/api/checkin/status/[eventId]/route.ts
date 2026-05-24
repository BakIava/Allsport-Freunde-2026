import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCheckinStatus } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { eventId } = await params;
    const id = Number(eventId);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });
    }

    const status = await getCheckinStatus(id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Fehler beim Laden des Check-In-Status:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
