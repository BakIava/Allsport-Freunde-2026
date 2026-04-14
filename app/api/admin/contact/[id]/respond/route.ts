import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getContactInquiry, addInquiryMessage, updateInquiryStatus } from "@/lib/db";
import { sendContactResponseEmail } from "@/lib/email";

export async function POST(
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
    const { responseText } = (await req.json()) as { responseText: string };
    if (!responseText?.trim()) {
      return NextResponse.json(
        { error: "Antworttext darf nicht leer sein." },
        { status: 400 }
      );
    }

    const inquiry = await getContactInquiry(inquiryId);
    if (!inquiry) {
      return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
    }

    // Save the admin message
    await addInquiryMessage(inquiryId, "admin", responseText.trim());

    // Update status to 'answered'
    await updateInquiryStatus(inquiryId, "answered");

    // Send response email to user
    sendContactResponseEmail({
      to: inquiry.email,
      firstName: inquiry.first_name ?? undefined,
      responseText: responseText.trim(),
      conversationToken: inquiry.conversation_token,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/contact/[id]/respond] POST error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
