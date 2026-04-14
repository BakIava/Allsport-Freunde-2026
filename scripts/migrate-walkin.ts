import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Walk-in Migration durch...\n");

  // Allow NULL email for walk-ins (they may not have an email)
  await sql`ALTER TABLE registrations ALTER COLUMN email DROP NOT NULL`;
  console.log("  ✓ Email-Spalte erlaubt jetzt NULL-Werte (für Walk-ins ohne E-Mail)");

  // Add walk-in flag
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN NOT NULL DEFAULT FALSE`;
  console.log("  ✓ Spalte is_walk_in hinzugefügt");

  // Add notes field
  await sql`ALTER TABLE registrations ADD COLUMN IF NOT EXISTS notes TEXT`;
  console.log("  ✓ Spalte notes hinzugefügt");

  // Index for walk-in queries
  await sql`CREATE INDEX IF NOT EXISTS idx_registrations_is_walk_in ON registrations(is_walk_in) WHERE is_walk_in = TRUE`;
  console.log("  ✓ Index auf is_walk_in erstellt");

  console.log("\nWalk-in Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
