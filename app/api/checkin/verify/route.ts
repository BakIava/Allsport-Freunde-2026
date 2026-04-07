import { NextRequest, NextResponse } from "next/server";
import { verifyCheckinToken } from "@/lib/checkin";
import { getRegistrationByQRToken, markCheckedIn } from "@/lib/db";
import { auth } from "@/lib/auth";
import { logAction } from "@/lib/audit";

// Simple in-memory rate limiter: 30 requests/minute per IP
// Note: resets on serverless cold starts; sufficient for event-day use.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 30;

  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte eine Minute." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json() as { token: string; checkedInBy?: string };
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }

    const payload = verifyCheckinToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Ungültiger oder abgelaufener QR-Code." }, { status: 400 });
    }

    const registration = await getRegistrationByQRToken(token);
    if (!registration) {
      return NextResponse.json({ error: "Anmeldung nicht gefunden." }, { status: 404 });
    }

    if (registration.status !== "approved") {
      return NextResponse.json({ error: "Diese Anmeldung ist nicht genehmigt." }, { status: 400 });
    }

    // Determine who is checking in (admin session or fallback to ip)
    const session = await auth();
    const checkedInBy = session?.user?.name ?? body.checkedInBy ?? ip;
    const actorId = session?.user?.dbId ?? undefined;

    if (registration.checked_in_at) {
      return NextResponse.json({
        success: true,
        alreadyCheckedIn: true,
        checkedInAt: registration.checked_in_at,
        participant: {
          name: `${registration.first_name} ${registration.last_name}`,
          email: registration.email,
          guests: registration.guests,
        },
      });
    }

    await markCheckedIn(registration.id, checkedInBy);

    logAction({
      userId: actorId ?? null,
      userName: checkedInBy,
      action: "CHECK_IN",
      entityType: "CHECKIN",
      entityId: registration.id,
      entityLabel: `${registration.first_name} ${registration.last_name} (QR)`,
      ipAddress: ip,
    });

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      participant: {
        name: `${registration.first_name} ${registration.last_name}`,
        email: registration.email,
        guests: registration.guests,
      },
    });
  } catch (error) {
    console.error("Fehler beim Check-In:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}

// Support GET for direct URL visits (e.g., phone camera scan without app)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const payload = verifyCheckinToken(token);
  if (!payload) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2 style="color:#dc2626">Ungültiger QR-Code</h2>
        <p>Dieser QR-Code ist ungültig oder abgelaufen.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Redirect to admin dashboard for this event
  return NextResponse.redirect(
    new URL(`/admin/events/${payload.eventId}/dashboard`, request.url)
  );
}
