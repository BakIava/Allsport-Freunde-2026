import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Survey-Migration durch...\n");

  await sql`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS survey_url TEXT
  `;
  console.log("  ✓ Spalte 'survey_url' zu 'events' hinzugefügt");

  await sql`
    ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS survey_sent_at TIMESTAMP
  `;
  console.log("  ✓ Spalte 'survey_sent_at' zu 'registrations' hinzugefügt");

  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
