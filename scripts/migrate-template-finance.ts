import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Fehler: POSTGRES_URL oder DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}
const sql = neon(dbUrl);

async function migrate() {
  console.log("Führe Template-Finance-Migration durch...\n");

  await sql`
    ALTER TABLE event_templates
    ADD COLUMN IF NOT EXISTS entry_price DECIMAL(10,2)
  `;
  console.log("  ✓ Spalte 'entry_price' zu event_templates hinzugefügt");

  await sql`
    CREATE TABLE IF NOT EXISTS template_costs (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL REFERENCES event_templates(id) ON DELETE CASCADE,
      description VARCHAR(500) NOT NULL,
      amount DECIMAL(10,2) NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_template_costs_template_id ON template_costs(template_id)`;
  console.log("  ✓ Tabelle 'template_costs' erstellt");

  console.log("\nTemplate-Finance-Migration abgeschlossen!");
}

migrate().catch((err) => {
  console.error("Fehler bei der Migration:", err);
  process.exit(1);
});
