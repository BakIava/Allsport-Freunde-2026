import {
  getCancellationTokenInfo,
  markCancellationTokenUsed,
  cancelRegistrationById,
} from "@/lib/db";
import { sendRegistrationCancelledEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

// GET /api/cancel-registration?token=xxx
// Returns preview data so the page can show name + event before confirming.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
  }

  try {
    const info = await getCancellationTokenInfo(token);
    if (!info) {
      return NextResponse.json({ tokenStatus: "not_found" });
    }

    let tokenStatus: "valid" | "expired" | "already_cancelled";
    if (info.usedAt !== null || info.registrationStatus === "cancelled") {
      tokenStatus = "already_cancelled";
    } else if (new Date(info.expiresAt) <= new Date()) {
      tokenStatus = "expired";
    } else {
      tokenStatus = "valid";
    }

    return NextResponse.json({
      tokenStatus,
      firstName: info.firstName,
      lastName: info.lastName,
      eventTitle: info.eventTitle,
      eventDate: info.eventDate,
      eventTime: info.eventTime,
      eventLocation: info.eventLocation,
    });
  } catch (error) {
    console.error("Fehler beim Laden des Stornierungslinks:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}

// POST /api/cancel-registration?token=xxx
// Validates token, cancels registration, sends confirmation email.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
  }

  try {
    const info = await getCancellationTokenInfo(token);
    if (!info) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    if (info.usedAt !== null || info.registrationStatus === "cancelled") {
      return NextResponse.json({ status: "already_cancelled" });
    }

    if (new Date(info.expiresAt) <= new Date()) {
      return NextResponse.json({ status: "expired" });
    }

    // Atomically mark the token as used (prevents double-cancel race)
    const marked = await markCancellationTokenUsed(token);
    if (!marked) {
      return NextResponse.json({ status: "already_cancelled" });
    }

    await cancelRegistrationById(info.registrationId);

    if (info.email) {
      sendRegistrationCancelledEmail({
        to: info.email,
        firstName: info.firstName,
        lastName: info.lastName,
        eventTitle: info.eventTitle,
        eventDate: info.eventDate,
        eventTime: info.eventTime,
        eventLocation: info.eventLocation,
        statusToken: info.statusToken,
      });
    }

    return NextResponse.json({
      status: "cancelled",
      registrationId: info.registrationId,
      statusToken: info.statusToken,
    });
  } catch (error) {
    console.error("Fehler beim Stornieren via Token:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
