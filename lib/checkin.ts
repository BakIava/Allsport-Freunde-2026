import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const CHECKIN_SECRET = process.env.CHECKIN_SECRET || "local-dev-checkin-secret-change-in-production";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface CheckinTokenPayload {
  eventId: number;
  participantId: number;
  registrationId: number;
}

export interface WalkInTokenPayload {
  eventId: number;
  type: "walk-in";
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

// ─── Walk-in Self-Service QR ─────────────────────────────

/**
 * Generates a signed JWT for the walk-in self-service QR code.
 * Expires at event end (date + time) + 24 hours, minimum 1 hour.
 */
export function generateWalkInToken(
  eventId: number,
  eventDate: string,
  eventTime: string
): string {
  const [year, month, day] = eventDate.split("-").map(Number);
  const [hours, minutes] = eventTime.split(":").map(Number);
  const eventEnd = new Date(year, month - 1, day, hours, minutes);
  const expiry = new Date(eventEnd.getTime() + 24 * 60 * 60 * 1000);

  // At least 1 hour of validity so the QR stays usable
  const secondsUntilExpiry = Math.max(
    Math.floor((expiry.getTime() - Date.now()) / 1000),
    3600
  );

  return jwt.sign({ eventId, type: "walk-in" }, CHECKIN_SECRET, {
    expiresIn: secondsUntilExpiry,
  });
}

/**
 * Verifies a walk-in token. Returns { eventId } or null.
 */
export function verifyWalkInToken(token: string): { eventId: number } | null {
  try {
    const payload = jwt.verify(token, CHECKIN_SECRET) as WalkInTokenPayload;
    if (payload.type !== "walk-in") return null;
    return { eventId: payload.eventId };
  } catch {
    return null;
  }
}

/**
 * Generates a large QR code PNG for the walk-in self-service page.
 */
export async function generateWalkInQRCode(eventId: number, token: string): Promise<string> {
  const url = `${APP_URL}/events/${eventId}/walk-in?token=${token}`;
  return QRCode.toDataURL(url, {
    width: 600,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Returns the walk-in self-service URL for a given event and token.
 */
export function getWalkInUrl(eventId: number, token: string): string {
  return `${APP_URL}/events/${eventId}/walk-in?token=${token}`;
}

