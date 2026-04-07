import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface Props {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  statusUrl: string;
  qrCode?: string;
}

export function RegistrationApprovedEmail({
  firstName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  statusUrl,
  qrCode,
}: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Anmeldung bestätigt! &#127881;</Text>
          <Text style={text}>
            Assalamu Alaikum {firstName},
          </Text>
          <Text style={text}>
            großartige Neuigkeiten! Deine Anmeldung zu{" "}
            <strong>{eventTitle}</strong> wurde bestätigt. Wir freuen uns auf dich!
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Event:</strong> {eventTitle}
            </Text>
            <Text style={infoText}>
              <strong>Datum:</strong> {eventDate} um {eventTime} Uhr
            </Text>
            <Text style={infoText}>
              <strong>Ort:</strong> {eventLocation}
            </Text>
          </Section>

          {qrCode && (
            <Section style={qrSection}>
              <Text style={qrHeading}>Dein Check-In QR-Code</Text>
              <Text style={qrInfo}>
                Zeige diesen QR-Code am Event-Tag beim Einlass vor.
              </Text>
              <Img
                src={qrCode}
                width="200"
                height="200"
                alt="Check-In QR-Code"
                style={qrImage}
              />
              <Text style={qrFallback}>
                Falls der QR-Code nicht angezeigt wird, findest du ihn auf deiner{" "}
                <Link href={statusUrl} style={link}>Status-Seite</Link>.
              </Text>
            </Section>
          )}

          <Text style={text}>
            Alle Details zu deiner Anmeldung findest du hier:
          </Text>
          <Link href={statusUrl} style={button}>
            Anmeldung ansehen
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

export default RegistrationApprovedEmail;

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
  color: "#16a34a",
  marginBottom: "16px",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333333",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
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

const qrSection: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
  textAlign: "center",
};

const qrHeading: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#333333",
  marginBottom: "8px",
};

const qrInfo: React.CSSProperties = {
  fontSize: "13px",
  color: "#666666",
  marginBottom: "16px",
};

const qrImage: React.CSSProperties = {
  display: "block",
  margin: "0 auto",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};

const qrFallback: React.CSSProperties = {
  fontSize: "12px",
  color: "#8898aa",
  marginTop: "12px",
};

const link: React.CSSProperties = {
  color: "#16a34a",
};

const button: React.CSSProperties = {
  backgroundColor: "#16a34a",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
  margin: "16px 0",
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
