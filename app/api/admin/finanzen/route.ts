import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllEvents } from "@/lib/db";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const events = await getAllEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Fehler beim Laden der Finanzdaten:", error);
    return NextResponse.json(
      { error: "Finanzdaten konnten nicht geladen werden." },
      { status: 500 }
    );
  }
}
