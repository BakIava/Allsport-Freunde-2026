import type { EventCategory, EventImageInput } from "./event";

export interface TemplateCost {
  id: number;
  template_id: number;
  description: string;
  amount: number;
}

export interface TemplateCostInput {
  description: string;
  amount: number;
}

export interface EventTemplate {
  id: number;
  /** Display name of the template, e.g. "Monatliches Vereinstraining" */
  name: string;
  /** Default event title pre-filled when using this template */
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  price: string;
  entry_price?: number | null;
  dress_code: string;
  max_participants: number;
  max_per_email?: number;
  last_used_at: string | null;
  created_at: string;
  images?: EventImageInput[];
  template_costs?: TemplateCost[];
}

export interface EventTemplateInput {
  name: string;
  title: string;
  category: EventCategory;
  description: string;
  location: string;
  price: string;
  entry_price?: number | null;
  dress_code: string;
  max_participants: number;
  images?: EventImageInput[];
  template_costs?: TemplateCostInput[];
}
