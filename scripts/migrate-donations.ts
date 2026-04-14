import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Donations-Migration durch...\n");

  await sql`
    CREATE TABLE IF NOT EXISTS event_donations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      registration_id INTEGER REFERENCES registrations(id) ON DELETE SET NULL,
      donor_name VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      note TEXT,
      created_by VARCHAR(100),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_donations_event_id ON event_donations(event_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_donations_registration_id ON event_donations(registration_id)`;
  console.log("  ✓ Tabelle 'event_donations' erstellt");

  console.log("\nDonations-Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
