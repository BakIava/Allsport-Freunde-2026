import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllHelpers, createHelper } from "@/lib/db";
import type { HelperQualification } from "@/lib/types";

const VALID_QUALIFICATIONS: HelperQualification[] = [
  "TRAINER",
  "AUFSICHT",
  "RETTUNGSSCHWIMMER",
];

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const helpers = await getAllHelpers();
    return NextResponse.json(helpers);
  } catch (error) {
    console.error("[admin/helfer] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, qualifications, notes } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name ist erforderlich." }, { status: 400 });
    }
    if (!Array.isArray(qualifications) || qualifications.length === 0) {
      return NextResponse.json(
        { error: "Mindestens eine Qualifikation ist erforderlich." },
        { status: 400 }
      );
    }
    const invalidQuals = qualifications.filter(
      (q: unknown) => !VALID_QUALIFICATIONS.includes(q as HelperQualification)
    );
    if (invalidQuals.length > 0) {
      return NextResponse.json(
        { error: "Ungültige Qualifikation(en) angegeben." },
        { status: 400 }
      );
    }

    const helper = await createHelper({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      qualifications: qualifications as HelperQualification[],
      notes: notes?.trim() || null,
      is_active: true,
    });

    return NextResponse.json(helper, { status: 201 });
  } catch (error) {
    console.error("[admin/helfer] POST error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
