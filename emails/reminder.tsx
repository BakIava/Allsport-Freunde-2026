import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface Props {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  statusUrl: string;
  cancelUrl: string;
}

export function ReminderEmail({
  firstName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  statusUrl,
  cancelUrl,
}: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Erinnerung: Morgen ist es soweit! &#128197;</Text>
          <Text style={text}>
            Assalamu Alaikum {firstName},
          </Text>
          <Text style={text}>
            wir erinnern dich daran, dass <strong>{eventTitle}</strong> morgen stattfindet.
            Wir freuen uns auf dich!
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Event:</strong> {eventTitle}
            </Text>
            <Text style={infoText}>
              <strong>Datum:</strong> {eventDate}
            </Text>
            <Text style={infoText}>
              <strong>Uhrzeit:</strong> {eventTime} Uhr
            </Text>
            <Text style={infoText}>
              <strong>Ort:</strong> {eventLocation}
            </Text>
          </Section>
          <Text style={text}>
            Deinen Status und QR-Code für den Check-In findest du hier:
          </Text>
          <Link href={statusUrl} style={primaryButton}>
            Mein Status &amp; QR-Code
          </Link>
          <Text style={cancelText}>
            Kannst du doch nicht teilnehmen? Bitte sag rechtzeitig ab:
          </Text>
          <Link href={cancelUrl} style={secondaryButton}>
            Anmeldung absagen
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            Allsport Freunde 2026 e.V. – Gemeinsam sportlich in der Rhein-Main-Region
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReminderEmail;

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};

const heading: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#d97706",
  marginBottom: "16px",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333333",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
};

const infoText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#333333",
  margin: "4px 0",
};

const cancelText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  marginTop: "24px",
};

const primaryButton: React.CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "8px 0",
};

const secondaryButton: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  color: "#6b7280",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "normal",
  padding: "10px 20px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "4px 0",
  border: "1px solid #d1d5db",
};

const hr: React.CSSProperties = {
  borderColor: "#e6ebf1",
  margin: "32px 0 16px",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#8898aa",
  lineHeight: "20px",
};
