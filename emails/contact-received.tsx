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
  firstName?: string;
  eventTitle?: string;
  conversationUrl: string;
}

export function ContactReceivedEmail({ firstName, eventTitle, conversationUrl }: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Deine Anfrage ist eingegangen</Text>
          <Text style={text}>
            Assalamu Alaikum{firstName ? ` ${firstName}` : ""},
          </Text>
          <Text style={text}>
            vielen Dank für deine Nachricht an <strong>Allsport Freunde 2026</strong>!
            Wir haben deine Anfrage erhalten und werden uns innerhalb von <strong>48 Stunden</strong> bei dir melden.
          </Text>
          {eventTitle && (
            <Section style={infoBox}>
              <Text style={infoText}>
                <strong>Betreffende Veranstaltung:</strong> {eventTitle}
              </Text>
            </Section>
          )}
          <Text style={text}>
            Du kannst deine Anfrage und unsere Antwort jederzeit unter folgendem Link einsehen:
          </Text>
          <Link href={conversationUrl} style={button}>
            Anfrage ansehen
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

export default ContactReceivedEmail;

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
  backgroundColor: "#f0f7ff",
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
