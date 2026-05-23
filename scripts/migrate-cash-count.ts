import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Kassenabschluss-Migration durch...\n");

  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cash_counted DECIMAL(10,2)`;
  console.log("  ✓ events.cash_counted hinzugefügt");

  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cash_counted_at TIMESTAMPTZ`;
  console.log("  ✓ events.cash_counted_at hinzugefügt");

  console.log("\nKassenabschluss-Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
