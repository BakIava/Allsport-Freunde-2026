import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const CHECKIN_SECRET = process.env.CHECKIN_SECRET || "local-dev-checkin-secret-change-in-production";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface CheckinTokenPayload {
  eventId: number;
  participantId: number;
  registrationId: number;
}

/**
 * Generates a signed JWT for a check-in.
 * Expires at event end (date + time) + 24 hours.
 */
export function generateCheckinToken(
  payload: CheckinTokenPayload,
  eventDate: string,
  eventTime: string
): string {
  // Parse event date/time in local time (Europe/Berlin assumed)
  const [year, month, day] = eventDate.split("-").map(Number);
  const [hours, minutes] = eventTime.split(":").map(Number);
  const eventEnd = new Date(year, month - 1, day, hours, minutes);
  const expiry = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);

  return jwt.sign(payload, CHECKIN_SECRET, {
    expiresIn: Math.floor((expiry.getTime() - Date.now()) / 1000),
  });
}

/**
 * Verifies and decodes a check-in JWT.
 * Returns null if invalid or expired.
 */
export function verifyCheckinToken(token: string): CheckinTokenPayload | null {
  try {
    return jwt.verify(token, CHECKIN_SECRET) as CheckinTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generates a QR code PNG as a base64 data URL.
 * The encoded URL points to the verify endpoint.
 */
export async function generateQRCode(token: string): Promise<string> {
  const checkinUrl = `${APP_URL}/api/checkin/verify?token=${token}`;
  return QRCode.toDataURL(checkinUrl, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
