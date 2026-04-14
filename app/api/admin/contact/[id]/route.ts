import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContactInquiry, updateInquiryStatus } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const inquiryId = parseInt(id, 10);
  if (isNaN(inquiryId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const inquiry = await getContactInquiry(inquiryId);
    if (!inquiry) {
      return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(inquiry);
  } catch (error) {
    console.error("[admin/contact/[id]] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const inquiryId = parseInt(id, 10);
  if (isNaN(inquiryId)) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const { status } = (await req.json()) as { status: "open" | "answered" | "resolved" };
    if (!["open", "answered", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
    }
    await updateInquiryStatus(inquiryId, status);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/contact/[id]] PATCH error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
