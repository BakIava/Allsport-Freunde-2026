import { getRegistrationsDueForReminder, sendReminderEmail } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registrations = await getRegistrationsDueForReminder();
  console.log(`[Cron] send-reminders: ${registrations.length} fällige Erinnerung(en) gefunden`);

  let sent = 0;
  let errors = 0;

  for (const reg of registrations) {
    try {
      await sendReminderEmail(reg.id);
      sent++;
      console.log(`[Cron] Erinnerung gesendet an ${reg.email} (Registration ${reg.id})`);
    } catch (err) {
      errors++;
      console.error(`[Cron] Fehler bei Registration ${reg.id}:`, err);
    }
  }

  console.log(`[Cron] send-reminders abgeschlossen: ${sent} gesendet, ${errors} Fehler`);
  return NextResponse.json({ sent, errors });
}
