import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Reminder-Migration durch...\n");

  // ── registrations: reminder_sent_at ──────────────────────
  await sql`
    ALTER TABLE registrations
      ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP
  `;
  console.log("  ✓ Spalte 'reminder_sent_at' zu 'registrations' hinzugefügt");

  // ── cancellation_tokens ───────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS cancellation_tokens (
      id              TEXT        NOT NULL PRIMARY KEY,
      token           TEXT        NOT NULL UNIQUE,
      registration_id INTEGER     NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      expires_at      TIMESTAMP   NOT NULL,
      used_at         TIMESTAMP,
      created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cancellation_tokens_token
      ON cancellation_tokens(token)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_cancellation_tokens_registration_id
      ON cancellation_tokens(registration_id)
  `;
  console.log("  ✓ Tabelle 'cancellation_tokens' erstellt");

  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
