import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContactInquiries } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const inquiries = await getContactInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error("[admin/contact] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
