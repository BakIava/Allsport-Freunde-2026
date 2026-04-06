import { Resend } from "resend";
import { RegistrationReceivedEmail } from "@/emails/registration-received";
import { RegistrationApprovedEmail } from "@/emails/registration-approved";
import { RegistrationRejectedEmail } from "@/emails/registration-rejected";
import { RegistrationCancelledEmail } from "@/emails/registration-cancelled";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.EMAIL_FROM || "Allsport Freunde <noreply@allsport-freunde.de>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
    })
  );
}

export async function sendRegistrationApprovedEmail(data: EmailData) {
  const statusUrl = `${appUrl}/status/${data.statusToken}`;
  const subject = `Anmeldung bestätigt – ${data.eventTitle}`;

  sendEmail(
    subject,
    data.to,
    RegistrationApprovedEmail({
      firstName: data.firstName,
      eventTitle: data.eventTitle,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
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
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
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
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      eventLocation: data.eventLocation,
      statusUrl,
      note: data.note,
    })
  );
}
