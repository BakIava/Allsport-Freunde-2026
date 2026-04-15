import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Finance-Migration durch...\n");

  // 1. entry_price auf events
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_price DECIMAL(10,2)`;
  console.log("  ✓ events.entry_price hinzugefügt (DECIMAL, nullable)");

  // 2. event_costs Tabelle
  await sql`
    CREATE TABLE IF NOT EXISTS event_costs (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_costs_event_id ON event_costs(event_id)`;
  console.log("  ✓ Tabelle 'event_costs' erstellt");

  // 3. audit_logs Tabelle
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      admin_username VARCHAR(100),
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(100) NOT NULL,
      entity_id VARCHAR(255),
      details JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`;
  console.log("  ✓ Tabelle 'audit_logs' erstellt");

  console.log("\nFinance-Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
