import { neon } from "@neondatabase/serverless";
import type { AuditAction, EntityType, AuditLog } from "./types";

function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

interface LogActionParams {
  userId?: number | null;
  userName?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number | null;
  entityLabel?: string | null;
  changes?: { old?: Record<string, unknown>; new?: Record<string, unknown> } | null;
  ipAddress?: string | null;
  success?: boolean;
}

/**
 * Central audit logging function. Fire-and-forget – never throws.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return; // No DB = no logging (local dev fallback mode)

  try {
    const sql = neon(dbUrl);
    const {
      userId = null,
      userName = null,
      action,
      entityType,
      entityId = null,
      entityLabel = null,
      changes = null,
      ipAddress = null,
      success = true,
    } = params;

    await sql`
      INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, entity_label, changes, ip_address, success)
      VALUES (
        ${userId},
        ${userName},
        ${action},
        ${entityType},
        ${entityId},
        ${entityLabel},
        ${changes ? JSON.stringify(changes) : null},
        ${ipAddress},
        ${success}
      )
    `;
  } catch (err) {
    // Non-fatal: log to console but never crash the main request
    console.error("[audit] Fehler beim Schreiben des Audit-Logs:", err);
  }
}

export interface AuditLogFilter {
  entityType?: EntityType;
  entityId?: number;
  userId?: number;
  action?: AuditAction;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) return [];

  const sql = neon(dbUrl);
  const { entityType, entityId, userId, action, from, to, limit = 100, offset = 0 } = filter;

  // Build dynamic query using tagged template – we fall back to a JS-side filter after fetch
  // because neon tagged template doesn't support dynamic WHERE clauses without sql fragments
  const rows = await sql`
    SELECT *
    FROM audit_logs
    WHERE
      (${entityType ?? null}::text IS NULL OR entity_type = ${entityType ?? null})
      AND (${entityId ?? null}::int IS NULL OR entity_id = ${entityId ?? null})
      AND (${userId ?? null}::int IS NULL OR user_id = ${userId ?? null})
      AND (${action ?? null}::text IS NULL OR action = ${action ?? null})
      AND (${from ?? null}::timestamptz IS NULL OR timestamp >= ${from ?? null}::timestamptz)
      AND (${to ?? null}::timestamptz IS NULL OR timestamp <= ${to ?? null}::timestamptz)
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return rows as AuditLog[];
}

export async function getEntityAuditLogs(
  entityType: EntityType,
  entityId: number
): Promise<AuditLog[]> {
  return getAuditLogs({ entityType, entityId, limit: 200 });
}
