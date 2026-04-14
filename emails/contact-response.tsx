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
  responseText: string;
  conversationUrl: string;
}

export function ContactResponseEmail({ firstName, responseText, conversationUrl }: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Wir haben dir geantwortet!</Text>
          <Text style={text}>
            Assalamu Alaikum{firstName ? ` ${firstName}` : ""},
          </Text>
          <Text style={text}>
            wir haben deine Anfrage beantwortet. Hier ist unsere Antwort:
          </Text>
          <Section style={responseBox}>
            <Text style={responseText_}>
              {responseText}
            </Text>
          </Section>
          <Text style={text}>
            Du kannst die vollständige Konversation einsehen und uns eine Rückmeldung schicken:
          </Text>
          <Link href={conversationUrl} style={button}>
            Konversation ansehen & antworten
          </Link>
          <Text style={smallText}>
            Dieser Link ist 30 Tage gültig.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Allsport Freunde 2026 e.V. – Gemeinsam sportlich in der Rhein-Main-Region
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ContactResponseEmail;

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
const responseBox: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
  borderLeft: "4px solid #16a34a",
};
const responseText_: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#1a1a1a",
  margin: 0,
  whiteSpace: "pre-wrap" as const,
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
const smallText: React.CSSProperties = {
  fontSize: "12px",
  color: "#8898aa",
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
