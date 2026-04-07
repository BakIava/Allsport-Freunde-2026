import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Check-In Migration durch...\n");

  await sql`
    ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS qr_code TEXT,
      ADD COLUMN IF NOT EXISTS qr_token TEXT,
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS checked_in_by VARCHAR(255)
  `;
  console.log("  ✓ Spalten qr_code, qr_token, checked_in_at, checked_in_by hinzugefügt");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_registrations_qr_token ON registrations(qr_token)
  `;
  console.log("  ✓ Index auf qr_token erstellt");

  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
