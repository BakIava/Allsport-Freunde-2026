import { getSQL, isPostgresConfigured } from "./utils";
import type { EventTemplate, EventTemplateInput, EventImageInput } from "../types";

async function setTemplateImages(templateId: number, images: EventImageInput[]): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM template_images WHERE template_id = ${templateId}`;
  for (const img of images) {
    await sql`INSERT INTO template_images (template_id, url, alt_text, position) VALUES (${templateId}, ${img.url}, ${img.alt_text}, ${img.position})`;
  }
}

async function setTemplateCosts(templateId: number, costs: { description: string; amount: number }[]): Promise<void> {
  const sql = getSQL();
  await sql`DELETE FROM template_costs WHERE template_id = ${templateId}`;
  for (const c of costs) {
    await sql`INSERT INTO template_costs (template_id, description, amount) VALUES (${templateId}, ${c.description}, ${c.amount})`;
  }
}

export async function getAllTemplates(): Promise<EventTemplate[]> {
  if (!isPostgresConfigured()) {
    const { getLocalAllTemplates } = await import("../local-data");
    return getLocalAllTemplates();
  }
  const sql = getSQL();
  const rows = await sql`
    SELECT t.*,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM template_images i WHERE i.template_id = t.id), '[]') AS images,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('id', c.id, 'template_id', c.template_id, 'description', c.description, 'amount', c.amount::float8) ORDER BY c.id) FROM template_costs c WHERE c.template_id = t.id), '[]') AS template_costs
    FROM event_templates t
    ORDER BY t.last_used_at DESC NULLS LAST, t.created_at DESC
  `;
  return rows as EventTemplate[];
}

export async function getTemplate(id: number): Promise<EventTemplate | null> {
  if (!isPostgresConfigured()) {
    const { getLocalTemplate } = await import("../local-data");
    return getLocalTemplate(id);
  }
  const sql = getSQL();
  const rows = await sql`
    SELECT t.*,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('url', i.url, 'alt_text', i.alt_text, 'position', i.position) ORDER BY i.position) FROM template_images i WHERE i.template_id = t.id), '[]') AS images,
      COALESCE((SELECT JSON_AGG(jsonb_build_object('id', c.id, 'template_id', c.template_id, 'description', c.description, 'amount', c.amount::float8) ORDER BY c.id) FROM template_costs c WHERE c.template_id = t.id), '[]') AS template_costs
    FROM event_templates t
    WHERE t.id = ${id}
  `;
  return (rows[0] as EventTemplate) ?? null;
}

export async function createTemplate(data: EventTemplateInput): Promise<{ id: number }> {
  if (!isPostgresConfigured()) {
    const { createLocalTemplate } = await import("../local-data");
    return createLocalTemplate(data);
  }
  const sql = getSQL();
  const rows = await sql`
    INSERT INTO event_templates (name, title, category, description, location, price, entry_price, dress_code, max_participants)
    VALUES (${data.name}, ${data.title}, ${data.category}, ${data.description}, ${data.location}, ${data.price}, ${data.entry_price ?? null}, ${data.dress_code}, ${data.max_participants})
    RETURNING id
  `;
  const { id } = rows[0] as { id: number };
  if (data.images?.length) await setTemplateImages(id, data.images);
  if (data.template_costs?.length) await setTemplateCosts(id, data.template_costs);
  return { id };
}

export async function updateTemplate(id: number, data: EventTemplateInput): Promise<void> {
  if (!isPostgresConfigured()) {
    const { updateLocalTemplate } = await import("../local-data");
    updateLocalTemplate(id, data);
    return;
  }
  const sql = getSQL();
  await sql`
    UPDATE event_templates SET
      name = ${data.name},
      title = ${data.title},
      category = ${data.category},
      description = ${data.description},
      location = ${data.location},
      price = ${data.price},
      entry_price = ${data.entry_price ?? null},
      dress_code = ${data.dress_code},
      max_participants = ${data.max_participants}
    WHERE id = ${id}
  `;
  if (data.images !== undefined) await setTemplateImages(id, data.images);
  if (data.template_costs !== undefined) await setTemplateCosts(id, data.template_costs);
}

export async function deleteTemplate(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { deleteLocalTemplate } = await import("../local-data");
    deleteLocalTemplate(id);
    return;
  }
  const sql = getSQL();
  // template_images has ON DELETE CASCADE, so this is enough:
  await sql`DELETE FROM event_templates WHERE id = ${id}`;
}

export async function touchTemplate(id: number): Promise<void> {
  if (!isPostgresConfigured()) {
    const { touchLocalTemplate } = await import("../local-data");
    touchLocalTemplate(id);
    return;
  }
  const sql = getSQL();
  await sql`UPDATE event_templates SET last_used_at = NOW() WHERE id = ${id}`;
}
