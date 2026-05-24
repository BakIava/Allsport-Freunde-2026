import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

export function isPostgresConfigured(): boolean {
  return !!getDatabaseUrl();
}

export function getSQL() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("Keine Datenbank-URL konfiguriert");
  return neon(url);
}

export async function logAudit(
  adminUsername: string | null,
  action: string,
  entityType: string,
  entityId: string | number | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const sql = getSQL();
    await sql`
      INSERT INTO audit_logs (admin_username, action, entity_type, entity_id, details)
      VALUES (
        ${adminUsername},
        ${action},
        ${entityType},
        ${entityId != null ? String(entityId) : null},
        ${details ? JSON.stringify(details) : null}
      )
    `;
  } catch {
    // Audit logging must never break the main operation
    console.error("Audit-Log-Fehler (nicht-kritisch)");
  }
}
