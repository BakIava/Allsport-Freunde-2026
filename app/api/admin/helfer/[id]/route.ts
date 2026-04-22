import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHelperById, updateHelper, deleteHelper } from "@/lib/db";
import type { HelperQualification } from "@/lib/types";

const VALID_QUALIFICATIONS: HelperQualification[] = [
  "TRAINER",
  "AUFSICHT",
  "RETTUNGSSCHWIMMER",
];

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const helper = await getHelperById(numId);
    if (!helper) {
      return NextResponse.json({ error: "Helfer nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(helper);
  } catch (error) {
    console.error("[admin/helfer/[id]] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, email, phone, qualifications, notes, is_active } = body;

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

    const updated = await updateHelper(numId, {
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      qualifications: qualifications as HelperQualification[],
      notes: notes?.trim() || null,
      is_active: typeof is_active === "boolean" ? is_active : true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Helfer nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[admin/helfer/[id]] PUT error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) {
    return NextResponse.json({ error: "Ungültige ID." }, { status: 400 });
  }

  try {
    const result = await deleteHelper(numId);
    if (!result.success) {
      if (result.reason === "has_assignments") {
        return NextResponse.json(
          { error: "Helfer hat Eventzuweisungen und kann nicht gelöscht werden." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Helfer nicht gefunden." }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[admin/helfer/[id]] DELETE error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
