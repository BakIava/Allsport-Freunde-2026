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
  senderName: string;
  senderEmail: string;
  eventTitle?: string;
  messagePreview: string;
  adminUrl: string;
}

export function ContactAdminEmail({
  senderName,
  senderEmail,
  eventTitle,
  messagePreview,
  adminUrl,
}: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Neue Kontaktanfrage eingegangen</Text>
          <Text style={text}>
            Es gibt eine neue Anfrage im Admin-Panel.
          </Text>
          <Section style={infoBox}>
            <Text style={infoText}>
              <strong>Von:</strong> {senderName} ({senderEmail})
            </Text>
            {eventTitle && (
              <Text style={infoText}>
                <strong>Veranstaltung:</strong> {eventTitle}
              </Text>
            )}
            <Text style={infoText}>
              <strong>Nachricht:</strong>
            </Text>
            <Text style={{ ...infoText, fontStyle: "italic" }}>
              "{messagePreview.length > 200 ? messagePreview.slice(0, 200) + "…" : messagePreview}"
            </Text>
          </Section>
          <Link href={adminUrl} style={button}>
            Anfrage im Admin-Panel öffnen
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            Allsport Freunde 2026 – Admin-Benachrichtigung
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactAdminEmail;

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
  color: "#1a1a1a",
  marginBottom: "16px",
};
const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333333",
};
const infoBox: React.CSSProperties = {
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
  borderLeft: "4px solid #f97316",
};
const infoText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#333333",
  margin: "4px 0",
};
const button: React.CSSProperties = {
  backgroundColor: "#1d4ed8",
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
