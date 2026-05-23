import { getSQL } from "./utils";
import type { Helper, HelperInput } from "../types";

export async function getAllHelpers(): Promise<Helper[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, name, email, phone, qualifications, notes, is_active,
           created_at, updated_at
    FROM helpers
    ORDER BY is_active DESC, name ASC
  `;
  return rows as Helper[];
}

export async function getHelperById(id: number): Promise<Helper | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, name, email, phone, qualifications, notes, is_active,
           created_at, updated_at
    FROM helpers
    WHERE id = ${id}
  `;
  return (rows[0] as Helper) ?? null;
}

export async function createHelper(input: HelperInput): Promise<Helper> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO helpers (name, email, phone, qualifications, notes, is_active)
    VALUES (
      ${input.name},
      ${input.email ?? null},
      ${input.phone ?? null},
      ${input.qualifications},
      ${input.notes ?? null},
      ${input.is_active ?? true}
    )
    RETURNING id, name, email, phone, qualifications, notes, is_active,
              created_at, updated_at
  `;
  return rows[0] as Helper;
}

export async function updateHelper(
  id: number,
  input: HelperInput
): Promise<Helper | null> {
  const sql = getSQL();
  const rows = await sql`
    UPDATE helpers
    SET name          = ${input.name},
        email         = ${input.email ?? null},
        phone         = ${input.phone ?? null},
        qualifications = ${input.qualifications},
        notes         = ${input.notes ?? null},
        is_active     = ${input.is_active ?? true},
        updated_at    = NOW()
    WHERE id = ${id}
    RETURNING id, name, email, phone, qualifications, notes, is_active,
              created_at, updated_at
  `;
  return (rows[0] as Helper) ?? null;
}

export async function deleteHelper(
  id: number
): Promise<{ success: boolean; reason?: "not_found" | "has_assignments" }> {
  const sql = getSQL();
  // TODO Phase 2: prüfen ob helper_event_assignments existieren, bevor gelöscht wird
  const rows = await sql`
    DELETE FROM helpers WHERE id = ${id} RETURNING id
  `;
  if (rows.length === 0) return { success: false, reason: "not_found" };
  return { success: true };
}
