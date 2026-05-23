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
  surveyUrl: string;
}

export function SurveyEmail({ firstName, eventTitle, eventDate, surveyUrl }: Props) {
  return (
    <Html lang="de">
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Wie war das Event? &#127775;</Text>
          <Text style={text}>
            Assalamu Alaikum {firstName},
          </Text>
          <Text style={text}>
            wir hoffen, du hattest eine tolle Zeit bei <strong>{eventTitle}</strong> am{" "}
            {eventDate}. Dein Feedback ist uns wichtig, damit wir unsere Events
            noch besser gestalten können!
          </Text>
          <Section style={surveyBox}>
            <Text style={surveyHeading}>Deine Meinung zählt</Text>
            <Text style={surveyText}>
              Die Umfrage dauert nur wenige Minuten. Vielen Dank, dass du dir die Zeit nimmst!
            </Text>
            <Link href={surveyUrl} style={button}>
              Zur Feedback-Umfrage
            </Link>
          </Section>
          <Text style={thanksText}>
            Wir freuen uns schon auf das nächste gemeinsame Event!
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

export default SurveyEmail;

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
  color: "#7c3aed",
  marginBottom: "16px",
};

const text: React.CSSProperties = {
  fontSize: "16px",
  lineHeight: "26px",
  color: "#333333",
};

const surveyBox: React.CSSProperties = {
  backgroundColor: "#f5f3ff",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "24px 0",
  borderLeft: "4px solid #7c3aed",
};

const surveyHeading: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: "bold",
  color: "#4c1d95",
  margin: "0 0 6px 0",
};

const surveyText: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#5b21b6",
  margin: "0 0 16px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#7c3aed",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "bold",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
};

const thanksText: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#555555",
  marginTop: "8px",
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
