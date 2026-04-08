import { NextRequest, NextResponse } from "next/server";
import { getContactInquiryByToken, addInquiryMessage, updateInquiryStatus } from "@/lib/db";
import { sendContactAdminEmail } from "@/lib/email";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || "";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Ungültiger Token." }, { status: 400 });
  }

  try {
    const { message } = (await req.json()) as { message: string };
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Nachricht darf nicht leer sein." },
        { status: 400 }
      );
    }

    const inquiry = await getContactInquiryByToken(token);
    if (!inquiry) {
      return NextResponse.json(
        { error: "Anfrage nicht gefunden oder abgelaufen." },
        { status: 404 }
      );
    }

    // Prevent replies to resolved inquiries
    if (inquiry.status === "resolved") {
      return NextResponse.json(
        { error: "Diese Anfrage wurde bereits abgeschlossen." },
        { status: 409 }
      );
    }

    await addInquiryMessage(inquiry.id, "user", message.trim());

    // Re-open if previously answered
    if (inquiry.status === "answered") {
      await updateInquiryStatus(inquiry.id, "open");
    }

    // Notify admin about follow-up
    const senderName =
      [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" ") ||
      inquiry.email;

    if (ADMIN_EMAIL) {
      sendContactAdminEmail({
        adminEmail: ADMIN_EMAIL,
        senderName,
        senderEmail: inquiry.email,
        eventTitle: inquiry.event_title ?? undefined,
        messagePreview: message.trim(),
        inquiryId: inquiry.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[conversation/[token]/reply] POST error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
