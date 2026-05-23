import { getSQL } from "./utils";
import type { RegistrationPerson, PersonInput, PersonWithRegistration } from "../types";

export async function getRemainingSlots(
  eventId: number,
  email: string,
  maxPerEmail: number
): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(rp.id)::int AS used
    FROM registration_persons rp
    JOIN registrations r ON rp.registration_id = r.id
    WHERE r.event_id = ${eventId}
      AND r.email = ${email.toLowerCase().trim()}
      AND rp.cancelled_at IS NULL
  `;
  const used = (rows[0] as { used: number }).used;
  return Math.max(0, maxPerEmail - used);
}

export async function createRegistrationPersons(
  registrationId: number,
  persons: PersonInput[]
): Promise<void> {
  const sql = getSQL();
  for (const p of persons) {
    await sql`
      INSERT INTO registration_persons (registration_id, first_name, last_name)
      VALUES (${registrationId}, ${p.firstName.trim()}, ${p.lastName.trim()})
    `;
  }
}

export async function getPersonsByRegistration(
  registrationId: number
): Promise<RegistrationPerson[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT id, registration_id, first_name, last_name, checked_in_at, cancelled_at, created_at
    FROM registration_persons
    WHERE registration_id = ${registrationId}
    ORDER BY created_at ASC
  `;
  return rows as RegistrationPerson[];
}

export async function getPersonsForEvent(
  eventId: number
): Promise<PersonWithRegistration[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      rp.id,
      rp.registration_id,
      rp.first_name,
      rp.last_name,
      rp.checked_in_at,
      rp.cancelled_at,
      rp.created_at,
      r.email,
      r.is_walk_in,
      r.notes
    FROM registration_persons rp
    JOIN registrations r ON rp.registration_id = r.id
    WHERE r.event_id = ${eventId} AND r.status = 'approved'
    ORDER BY rp.cancelled_at NULLS FIRST, rp.last_name ASC, rp.first_name ASC
  `;
  return rows as PersonWithRegistration[];
}

export async function cancelPerson(personId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registration_persons
    SET cancelled_at = NOW()
    WHERE id = ${personId} AND cancelled_at IS NULL
  `;

  // Wenn alle Personen dieser Anmeldung storniert sind, Anmeldung als cancelled markieren
  await sql`
    UPDATE registrations r
    SET status = 'cancelled', status_changed_at = NOW()
    WHERE r.id = (
      SELECT registration_id FROM registration_persons WHERE id = ${personId}
    )
    AND NOT EXISTS (
      SELECT 1 FROM registration_persons rp2
      WHERE rp2.registration_id = r.id AND rp2.cancelled_at IS NULL
    )
    AND r.status != 'cancelled'
  `;
}

export async function checkInPerson(
  personId: string,
  checkedInBy: string
): Promise<{ alreadyCheckedIn: boolean }> {
  const sql = getSQL();
  const rows = await sql`
    SELECT checked_in_at FROM registration_persons WHERE id = ${personId}
  `;
  if (!rows[0]) throw new Error("Person nicht gefunden.");
  const person = rows[0] as { checked_in_at: string | null };
  if (person.checked_in_at) return { alreadyCheckedIn: true };

  await sql`
    UPDATE registration_persons
    SET checked_in_at = NOW()
    WHERE id = ${personId}
  `;

  // Setzt checked_in_at auf der Anmeldung, wenn noch nicht gesetzt (für QR-Sync)
  await sql`
    UPDATE registrations r
    SET checked_in_at = NOW(), checked_in_by = ${checkedInBy}
    WHERE r.id = (SELECT registration_id FROM registration_persons WHERE id = ${personId})
      AND r.checked_in_at IS NULL
  `;

  return { alreadyCheckedIn: false };
}

export async function undoPersonCheckin(personId: string): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registration_persons
    SET checked_in_at = NULL
    WHERE id = ${personId}
  `;
}

export async function checkInAllPersonsOfRegistration(
  registrationId: number,
  checkedInBy: string
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE registration_persons
    SET checked_in_at = NOW()
    WHERE registration_id = ${registrationId}
      AND cancelled_at IS NULL
      AND checked_in_at IS NULL
  `;
}
