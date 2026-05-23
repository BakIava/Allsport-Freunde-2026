import { getSQL } from "./utils";
import type {
  ContactInquiryWithEvent,
  ContactInquiryDetail,
  InquiryMessage,
  ContactFormInput,
} from "../types";

export async function createContactInquiry(
  data: ContactFormInput & { conversation_token: string }
): Promise<{ id: number; conversation_token: string }> {
  const sql = getSQL();
  // If user consented, keep data for 100 years; otherwise auto-delete after 90 days
  const deleteAt = data.consent_to_store
    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql`
    INSERT INTO contact_inquiries
      (first_name, last_name, email, whatsapp_number, message, event_id,
       conversation_token, consent_to_store, delete_at)
    VALUES (
      ${data.first_name ?? null},
      ${data.last_name ?? null},
      ${data.email},
      ${data.whatsapp_number ?? null},
      ${data.message},
      ${data.event_id ?? null},
      ${data.conversation_token},
      ${data.consent_to_store ?? false},
      ${deleteAt}
    )
    RETURNING id, conversation_token
  `;
  const row = rows[0] as { id: number; conversation_token: string };

  // Store the initial user message in the thread
  await sql`
    INSERT INTO inquiry_messages (inquiry_id, sender, message)
    VALUES (${row.id}, 'user', ${data.message})
  `;

  return row;
}

export async function getContactInquiries(): Promise<ContactInquiryWithEvent[]> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.delete_at > NOW()
    ORDER BY ci.created_at DESC
  `;
  return rows as ContactInquiryWithEvent[];
}

export async function getContactInquiry(id: number): Promise<ContactInquiryDetail | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.id = ${id} AND ci.delete_at > NOW()
  `;
  if (!rows[0]) return null;
  const inquiry = rows[0] as ContactInquiryWithEvent;

  const msgRows = await sql`
    SELECT * FROM inquiry_messages
    WHERE inquiry_id = ${id}
    ORDER BY sent_at ASC
  `;

  return { ...inquiry, messages: msgRows as InquiryMessage[] };
}

export async function getContactInquiryByToken(token: string): Promise<ContactInquiryDetail | null> {
  const sql = getSQL();
  const rows = await sql`
    SELECT
      ci.*,
      e.title AS event_title
    FROM contact_inquiries ci
    LEFT JOIN events e ON ci.event_id = e.id
    WHERE ci.conversation_token = ${token} AND ci.delete_at > NOW()
  `;
  if (!rows[0]) return null;
  const inquiry = rows[0] as ContactInquiryWithEvent;

  const msgRows = await sql`
    SELECT * FROM inquiry_messages
    WHERE inquiry_id = ${inquiry.id}
    ORDER BY sent_at ASC
  `;

  return { ...inquiry, messages: msgRows as InquiryMessage[] };
}

export async function addInquiryMessage(
  inquiryId: number,
  sender: "user" | "admin",
  message: string
): Promise<InquiryMessage> {
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO inquiry_messages (inquiry_id, sender, message)
    VALUES (${inquiryId}, ${sender}, ${message})
    RETURNING *
  `;
  return rows[0] as InquiryMessage;
}

export async function updateInquiryStatus(
  id: number,
  status: "open" | "answered" | "resolved"
): Promise<void> {
  const sql = getSQL();
  await sql`
    UPDATE contact_inquiries
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function getOpenInquiryCount(): Promise<number> {
  const sql = getSQL();
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM contact_inquiries
    WHERE status = 'open' AND delete_at > NOW()
  `;
  return (rows[0] as { count: number }).count;
}
