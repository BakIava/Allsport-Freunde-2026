import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Migration: registration_persons + max_per_email\n");

  // 1. Neue Tabelle
  await sql`
    CREATE TABLE IF NOT EXISTS registration_persons (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id   INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
      first_name        VARCHAR(100) NOT NULL,
      last_name         VARCHAR(100) NOT NULL,
      checked_in_at     TIMESTAMPTZ,
      cancelled_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reg_persons_registration_id ON registration_persons(registration_id)`;
  console.log("  ✓ Tabelle 'registration_persons' erstellt");

  // 2. max_per_email auf events
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS max_per_email INT NOT NULL DEFAULT 5`;
  console.log("  ✓ Spalte 'max_per_email' zu 'events' hinzugefügt");

  // 3. max_per_email auf event_templates
  await sql`ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS max_per_email INT NOT NULL DEFAULT 5`;
  console.log("  ✓ Spalte 'max_per_email' zu 'event_templates' hinzugefügt");

  // 4. Bestehende Anmelder migrieren (nur fehlende Einträge)
  const insertedMain = await sql`
    INSERT INTO registration_persons (registration_id, first_name, last_name, checked_in_at)
    SELECT r.id, r.first_name, r.last_name, r.checked_in_at
    FROM registrations r
    WHERE NOT EXISTS (
      SELECT 1 FROM registration_persons rp
      WHERE rp.registration_id = r.id
        AND rp.first_name = r.first_name
        AND rp.last_name = r.last_name
    )
    RETURNING id
  `;
  console.log(`  ✓ ${insertedMain.length} Anmelder migriert`);

  // 5. Bisherige Begleitpersonen migrieren
  const insertedGuests = await sql`
    INSERT INTO registration_persons (registration_id, first_name, last_name)
    SELECT r.id, 'Begleitperson', 'Begleitperson'
    FROM registrations r
    CROSS JOIN generate_series(1, r.guests) AS gs
    WHERE r.guests > 0
      AND (
        SELECT COUNT(*) FROM registration_persons rp
        WHERE rp.registration_id = r.id AND rp.first_name = 'Begleitperson'
      ) < r.guests
    RETURNING id
  `;
  console.log(`  ✓ ${insertedGuests.length} Begleitpersonen migriert`);

  const total = await sql`SELECT COUNT(*) AS n FROM registration_persons`;
  console.log(`\n  Gesamt in registration_persons: ${(total[0] as { n: string }).n} Personen`);
  console.log("\nMigration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
