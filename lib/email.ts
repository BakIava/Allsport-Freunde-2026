import { Resend } from "resend";
import { RegistrationReceivedEmail } from "@/emails/registration-received";
import { RegistrationApprovedEmail } from "@/emails/registration-approved";
import { RegistrationRejectedEmail } from "@/emails/registration-rejected";
import { RegistrationCancelledEmail } from "@/emails/registration-cancelled";
import { EventCancelledEmail } from "@/emails/event-cancelled";
import { ContactReceivedEmail } from "@/emails/contact-received";
import { ContactAdminEmail } from "@/emails/contact-admin";
import { ContactResponseEmail } from "@/emails/contact-response";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.EMAIL_FROM || "Allsport Freunde 2026 e.V. <noreply@allsport-freunde.com>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function formatDateDE(date: string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface EmailData {
  to: string;
  firstName: string;
  lastName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  statusToken: string;
}

async function sendEmail(subject: string, to: string, react: React.ReactElement) {
  if (!resend) {
    console.log(`[Email] An: ${to}`);
    console.log(`[Email] Betreff: ${subject}`);
    console.log("[Email] (RESEND_API_KEY nicht gesetzt – E-Mail nur geloggt)");
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      react,
    });
  } catch (error) {
    console.error("[Email] Fehler beim Senden:", error);
  }
}

export async function sendRegistrationReceivedEmail(data: EmailData) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Anmeldung eingegangen – ${data.eventTitle}`;

  // Fire-and-forget
  sendEmail(
    subject,
    data.to,
    RegistrationReceivedEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: formatDateDE(data.eventDate),
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
    })
  );
}

export async function sendRegistrationApprovedEmail(data: EmailData & { qrCode?: string }) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Anmeldung bestätigt – ${data.eventTitle}`;

  sendEmail(
    subject,
    data.to,
    RegistrationApprovedEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: formatDateDE(data.eventDate),
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
      qrCode: data.qrCode,
    })
  );
}

export async function sendRegistrationCancelledEmail(data: EmailData) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Anmeldung storniert – ${data.eventTitle}`;

  sendEmail(
    subject,
    data.to,
    RegistrationCancelledEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: formatDateDE(data.eventDate),
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
    })
  );
}

export async function sendEventCancelledEmail(
  data: EmailData & { cancellationReason?: string }
) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Veranstaltung abgesagt: ${data.eventTitle}`;

  sendEmail(
    subject,
    data.to,
    EventCancelledEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: formatDateDE(data.eventDate),
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      cancellationReason: data.cancellationReason,
      statusUrl,
    })
  );
}

export async function sendRegistrationRejectedEmail(
  data: EmailData & { note?: string }
) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Anmeldung abgelehnt – ${data.eventTitle}`;

  sendEmail(
    subject,
    data.to,
    RegistrationRejectedEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: formatDateDE(data.eventDate),
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
      note: data.note,
    })
  );
}

// ─── Contact Emails ──────────────────────────────────────

export async function sendContactReceivedEmail(data: {
  to: string;
  firstName?: string;
  eventTitle?: string;
  conversationToken: string;
}) {
  const conversationUrl = `${appUrl}/conversation/${data.conversationToken}`;
  sendEmail(
    "Deine Anfrage ist eingegangen – Allsport Freunde",
    data.to,
    ContactReceivedEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      conversationUrl,
    })
  );
}

export async function sendContactAdminEmail(data: {
  adminEmail: string;
  senderName: string;
  senderEmail: string;
  eventTitle?: string;
  messagePreview: string;
  inquiryId: number;
}) {
  const adminUrl = `${appUrl}/admin/contact/${data.inquiryId}`;
  sendEmail(
    `Neue Kontaktanfrage von ${data.senderName}`,
    data.adminEmail,
    ContactAdminEmail({
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      eventTitle: data.eventTitle,
      messagePreview: data.messagePreview,
      adminUrl,
    })
  );
}

export async function sendContactResponseEmail(data: {
  to: string;
  firstName?: string;
  responseText: string;
  conversationToken: string;
}) {
  const conversationUrl = `${appUrl}/conversation/${data.conversationToken}`;
  sendEmail(
    "Antwort auf deine Anfrage – Allsport Freunde",
    data.to,
    ContactResponseEmail({
      firstName: data.firstName,
      responseText: data.responseText,
      conversationUrl,
    })
  );
}
