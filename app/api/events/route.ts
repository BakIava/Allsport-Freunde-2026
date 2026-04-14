import { getEvents } from "@/lib/db";
import { getFromCache, setCache } from "@/lib/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cache-Key für die öffentliche Events-Liste (nur veröffentlichte, zukünftige Events)
const CACHE_KEY = "events:public";

export async function GET() {
  try {
    // Cache prüfen – bei Hit direkt zurückgeben
    const cached = getFromCache(CACHE_KEY);
    if (cached !== null) {
      return NextResponse.json(cached);
    }

    // Cache-Miss: Datenbank abfragen und Ergebnis cachen
    const events = await getEvents();
    setCache(CACHE_KEY, events);

    return NextResponse.json(events);
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    return NextResponse.json(
      { error: "Events konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
