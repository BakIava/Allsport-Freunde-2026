import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getContactInquiries } from "@/lib/db";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const inquiries = await getContactInquiries();
    return NextResponse.json(inquiries);
  } catch (error) {
    console.error("[admin/contact] GET error:", error);
    return NextResponse.json({ error: "Interner Serverfehler." }, { status: 500 });
  }
}
