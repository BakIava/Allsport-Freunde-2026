import "dotenv/config";
import { sql } from "@vercel/postgres";

async function setup() {
  console.log("Erstelle Tabellen in Vercel Postgres...\n");

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
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
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
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, email)
    )
  `;
  console.log("  ✓ Tabelle 'registrations' erstellt");

  console.log("\nDatenbank-Setup abgeschlossen!");
}

setup().catch((err) => {
  console.error("Fehler beim Setup:", err);
  process.exit(1);
});
