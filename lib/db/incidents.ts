import { getSQL } from "./utils";
import type { PersonIncident } from "../types";

/**
 * Normalised key used to match a person across events/registrations.
 * People are stored per-registration (registration_persons), so there is no
 * persistent person identity. We therefore key incidents on the normalised
 * "firstname lastname" combination (case- and whitespace-insensitive).
 */
export function incidentNameKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function createIncident(data: {
  first_name: string;
  last_name: string;
  description: string;
  incident_date?: string | null;
  created_by: string | null;
}): Promise<PersonIncident> {
  const sql = getSQL();
  const firstName = data.first_name.trim();
  const lastName = data.last_name.trim();
  const nameKey = incidentNameKey(firstName, lastName);
  const rows = await sql`
    INSERT INTO person_incidents
      (first_name, last_name, name_key, description, incident_date, created_by)
    VALUES
      (${firstName}, ${lastName}, ${nameKey}, ${data.description.trim()},
       ${data.incident_date ?? null}, ${data.created_by ?? null})
    RETURNING
      id, first_name, last_name, name_key, description,
      TO_CHAR(incident_date, 'YYYY-MM-DD') AS incident_date,
      created_by, created_at
  `;
  return rows[0] as PersonIncident;
}

export async function getIncidentsForName(
  firstName: string,
  lastName: string
): Promise<PersonIncident[]> {
  const sql = getSQL();
  const nameKey = incidentNameKey(firstName, lastName);
  const rows = await sql`
    SELECT
      id, first_name, last_name, name_key, description,
      TO_CHAR(incident_date, 'YYYY-MM-DD') AS incident_date,
      created_by, created_at
    FROM person_incidents
    WHERE name_key = ${nameKey}
    ORDER BY COALESCE(incident_date, created_at::date) DESC, created_at DESC
  `;
  return rows as PersonIncident[];
}

export async function deleteIncident(id: number): Promise<boolean> {
  const sql = getSQL();
  const rows = await sql`DELETE FROM person_incidents WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/**
 * Returns a map of name_key → incident count for the given persons.
 * Wrapped callers should tolerate a missing table (pre-migration).
 */
export async function getIncidentCountsForNames(
  persons: Array<{ first_name: string; last_name: string }>
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (persons.length === 0) return result;

  const keys = Array.from(
    new Set(persons.map((p) => incidentNameKey(p.first_name, p.last_name)))
  );
  if (keys.length === 0) return result;

  const sql = getSQL();
  const rows = (await sql`
    SELECT name_key, COUNT(*)::int AS count
    FROM person_incidents
    WHERE name_key = ANY(${keys})
    GROUP BY name_key
  `) as Array<{ name_key: string; count: number }>;

  for (const r of rows) result.set(r.name_key, r.count);
  return result;
}
