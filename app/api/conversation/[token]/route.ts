import { NextRequest, NextResponse } from "next/server";
import { getContactInquiryByToken } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Ungültiger Token." }, { status: 400 });
  }

  try {
    const inquiry = await getContactInquiryByToken(token);
    if (!inquiry) {
      return NextResponse.json(
        { error: "Anfrage nicht gefunden oder abgelaufen." },
        { status: 404 }
      );
    }

    // Strip sensitive admin-only fields before returning to user
    const { whatsapp_number: _, ...safe } = inquiry;
    return NextResponse.json(safe);
  } catch (error) {
    console.error("[conversation/[token]] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
