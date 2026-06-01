import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Vorfall-Migration durch...\n");

  await sql`
    CREATE TABLE IF NOT EXISTS person_incidents (
      id            SERIAL PRIMARY KEY,
      first_name    VARCHAR(100) NOT NULL,
      last_name     VARCHAR(100) NOT NULL,
      name_key      VARCHAR(220) NOT NULL,
      description   TEXT NOT NULL,
      incident_date DATE,
      created_by    VARCHAR(255),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✓ Tabelle 'person_incidents' bereit");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_person_incidents_name_key
    ON person_incidents(name_key)
  `;
  console.log("  ✓ Index auf name_key bereit");

  console.log("\nVorfall-Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
