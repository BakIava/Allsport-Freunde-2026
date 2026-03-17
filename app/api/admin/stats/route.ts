import { getAdminStats } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Fehler beim Laden der Statistiken:", error);
    return NextResponse.json({ error: "Statistiken konnten nicht geladen werden." }, { status: 500 });
  }
}
