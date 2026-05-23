import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyCheckinToken } from "@/lib/checkin";
import { getRegistrationWithPersonsByQRToken } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const { token } = (await request.json()) as { token: string };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token fehlt." }, { status: 400 });
    }

    const payload = verifyCheckinToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Ungültiger oder abgelaufener QR-Code." }, { status: 400 });
    }

    const registration = await getRegistrationWithPersonsByQRToken(token);
    if (!registration) {
      return NextResponse.json({ error: "Anmeldung nicht gefunden." }, { status: 404 });
    }

    if (registration.status !== "approved") {
      return NextResponse.json({ error: "Diese Anmeldung ist nicht genehmigt." }, { status: 400 });
    }

    return NextResponse.json(registration);
  } catch (error) {
    console.error("Fehler beim Lookup:", error);
    return NextResponse.json({ error: "Ein Fehler ist aufgetreten." }, { status: 500 });
  }
}
