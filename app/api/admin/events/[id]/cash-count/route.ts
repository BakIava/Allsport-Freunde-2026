import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveCashCount } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });

  const { id } = await params;
  const eventId = Number(id);
  if (isNaN(eventId)) return NextResponse.json({ error: "Ungültige Event-ID." }, { status: 400 });

  const body = await request.json();
  const amount = typeof body.amount === "number" ? body.amount : parseFloat(String(body.amount).replace(",", "."));

  if (isNaN(amount) || amount < 0) {
    return NextResponse.json({ error: "Ungültiger Betrag." }, { status: 400 });
  }

  try {
    await saveCashCount(eventId, Math.round(amount * 100) / 100);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Fehler beim Speichern des Kassenabschlusses:", err);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}
