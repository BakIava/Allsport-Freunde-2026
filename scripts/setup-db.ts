import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { hashSync } from "bcryptjs";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function setup() {
  console.log("Erstelle Tabellen in Neon Postgres...\n");

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(50) NOT NULL CHECK(category IN ('fussball', 'fitness', 'schwimmen')),
      description TEXT NOT NULL,
      date DATE NOT NULL,
      time VARCHAR(10) NOT NULL,
      location VARCHAR(255) NOT NULL,
      price VARCHAR(100) NOT NULL,
      dress_code VARCHAR(255) NOT NULL,
      max_participants INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      cancellation_reason TEXT,
      published_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  // Migration: add/update columns for existing databases
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft'`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS published_at TIMESTAMP`;
  // Migrate legacy 'active' status → 'published'
  await sql`UPDATE events SET status = 'published', published_at = created_at WHERE status = 'active'`;
  console.log("  ✓ Tabelle 'events' erstellt");

  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id),
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      guests INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      status_token VARCHAR(255),
      status_changed_at TIMESTAMP,
      status_note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, email)
    )
  `;
  console.log("  ✓ Tabelle 'registrations' erstellt");

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  console.log("  ✓ Tabelle 'admin_users' erstellt");

  // Insert default admin user
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin";
  const passwordHash = hashSync(password, 10);

  await sql`
    INSERT INTO admin_users (username, password_hash)
    VALUES (${username}, ${passwordHash})
    ON CONFLICT (username) DO UPDATE SET password_hash = ${passwordHash}
  `;
  console.log(`  ✓ Admin-User '${username}' erstellt`);

  console.log("\nDatenbank-Setup abgeschlossen!");
}

setup().catch((err) => {
  console.error("Fehler beim Setup:", err);
  process.exit(1);
});
