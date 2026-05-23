import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Migration: registration_persons + Constraints entfernen\n");

  // 1. Tabelle erstellen
  await sql`
    CREATE TABLE IF NOT EXISTS registration_persons (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      first_name      VARCHAR(100) NOT NULL,
      last_name       VARCHAR(100) NOT NULL,
      checked_in_at   TIMESTAMPTZ,
      cancelled_at    TIMESTAMPTZ,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_reg_persons_registration_id
    ON registration_persons(registration_id)
  `;
  console.log("  ✓ Tabelle 'registration_persons' bereit");

  // 1b. max_per_email auf events hinzufügen (falls noch nicht vorhanden)
  await sql`
    ALTER TABLE events
      ADD COLUMN IF NOT EXISTS max_per_email INT NOT NULL DEFAULT 5
  `;
  console.log("  ✓ Spalte 'max_per_email' auf events bereit");

  // 2. Datenmigration: pro Anmeldung prüfen (idempotent, sicher auch wenn
  //    registration_persons bereits Einträge für neue Anmeldungen hat)

  // Anmelder selbst – nur für Anmeldungen, die noch keinen Personen-Eintrag haben
  const main = await sql`
    INSERT INTO registration_persons (registration_id, first_name, last_name)
    SELECT r.id, r.first_name, r.last_name
    FROM registrations r
    WHERE r.first_name IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM registration_persons rp WHERE rp.registration_id = r.id
      )
    RETURNING id
  `;
  console.log(`  ✓ ${main.length} Anmelder migriert`);

  // Begleitpersonen – ebenfalls nur für Anmeldungen ohne bisherigen Personen-Eintrag
  const guests = await sql`
    INSERT INTO registration_persons (registration_id, first_name, last_name)
    SELECT r.id, 'Begleitperson', 'Begleitperson'
    FROM registrations r
    CROSS JOIN generate_series(1, r.guests) AS gs(n)
    WHERE r.guests > 0
      AND NOT EXISTS (
        SELECT 1 FROM registration_persons rp WHERE rp.registration_id = r.id
      )
    RETURNING id
  `;
  console.log(`  ✓ ${guests.length} Begleitpersonen migriert`);

  // 3. Spalten entfernen
  await sql`
    ALTER TABLE registrations
      DROP COLUMN IF EXISTS first_name,
      DROP COLUMN IF EXISTS last_name,
      DROP COLUMN IF EXISTS guests
  `;
  console.log("  ✓ Spalten first_name, last_name, guests aus registrations entfernt");

  // 4. Verifizieren: keine Anmeldung ohne Person
  const orphans = await sql`
    SELECT r.id, r.email
    FROM registrations r
    LEFT JOIN registration_persons p ON p.registration_id = r.id
    GROUP BY r.id, r.email
    HAVING COUNT(p.id) = 0
  `;
  if (orphans.length === 0) {
    console.log("  ✓ Alle Anmeldungen haben mindestens 1 Person");
  } else {
    console.warn(`  ⚠ ${orphans.length} Anmeldungen ohne Personen-Eintrag!`);
  }

  const total = await sql`SELECT COUNT(*)::int AS n FROM registration_persons`;
  console.log(`\n  Gesamt in registration_persons: ${(total[0] as { n: number }).n}`);
  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
