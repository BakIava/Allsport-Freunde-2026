import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Erstelle Kontaktformular-Tabellen in Neon Postgres...\n");

  // ── contact_inquiries ────────────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS contact_inquiries (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      whatsapp_number VARCHAR(50),
      message TEXT NOT NULL,
      event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'answered', 'resolved')),
      conversation_token VARCHAR(255) UNIQUE NOT NULL,
      consent_to_store BOOLEAN NOT NULL DEFAULT FALSE,
      delete_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_inquiries_token
    ON contact_inquiries(conversation_token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email
    ON contact_inquiries(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status
    ON contact_inquiries(status)`;
  console.log("  ✓ Tabelle 'contact_inquiries' erstellt");

  // ── inquiry_messages ─────────────────────────────────────
  // Stores all messages in the thread: initial user message, admin replies,
  // and user follow-ups. The original message is ALSO stored here as the
  // first entry (sender='user') for a uniform conversation view.
  await sql`
    CREATE TABLE IF NOT EXISTS inquiry_messages (
      id SERIAL PRIMARY KEY,
      inquiry_id INTEGER NOT NULL REFERENCES contact_inquiries(id) ON DELETE CASCADE,
      sender VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'admin')),
      message TEXT NOT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry_id
    ON inquiry_messages(inquiry_id)`;
  console.log("  ✓ Tabelle 'inquiry_messages' erstellt");

  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
