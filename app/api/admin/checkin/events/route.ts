import { NextResponse } from "next/server";
import { getCheckinEvents } from "@/lib/db";

// Never cache – event data must always be fresh
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCheckinEvents();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Fehler beim Laden der Check-In Events:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
