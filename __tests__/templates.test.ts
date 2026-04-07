/**
 * Tests for the Event-Vorlagen (Event Templates) feature.
 *
 * Uses the in-memory local-data layer only – no DB or network required.
 * resetLocalData() resets all shared state before each test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetLocalData,
  getLocalAllTemplates,
  getLocalTemplate,
  createLocalTemplate,
  updateLocalTemplate,
  deleteLocalTemplate,
  touchLocalTemplate,
  createLocalEvent,
  getLocalAllEvents,
} from "../lib/local-data";
import type { EventTemplate } from "../lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTemplate(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 1,
    name: "Test-Vorlage",
    title: "Test Event",
    category: "fussball",
    description: "Eine Beschreibung",
    location: "Testort",
    price: "Kostenlos",
    dress_code: "Sportkleidung",
    max_participants: 20,
    last_used_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── getLocalAllTemplates ──────────────────────────────────────────────────────

describe("getLocalAllTemplates", () => {
  beforeEach(() => resetLocalData());

  it("returns empty array when no templates exist", () => {
    expect(getLocalAllTemplates()).toHaveLength(0);
  });

  it("returns all templates", () => {
    resetLocalData([], [], [makeTemplate({ id: 1 }), makeTemplate({ id: 2, name: "Zweite" })]);
    expect(getLocalAllTemplates()).toHaveLength(2);
  });

  it("sorts by last_used_at DESC (recently used first), then by created_at DESC", () => {
    const older = makeTemplate({ id: 1, name: "Alt", last_used_at: "2026-01-01T00:00:00.000Z" });
    const newer = makeTemplate({ id: 2, name: "Neu", last_used_at: "2026-06-01T00:00:00.000Z" });
    const never = makeTemplate({ id: 3, name: "Nie", last_used_at: null, created_at: "2026-07-01T00:00:00.000Z" });
    resetLocalData([], [], [older, newer, never]);

    const result = getLocalAllTemplates();
    // recently used comes first, then never-used last
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
    expect(result[2].id).toBe(3);
  });
});

// ── getLocalTemplate ──────────────────────────────────────────────────────────

describe("getLocalTemplate", () => {
  beforeEach(() => resetLocalData());

  it("returns the matching template", () => {
    resetLocalData([], [], [makeTemplate({ id: 42, name: "Meine Vorlage" })]);
    const tpl = getLocalTemplate(42);
    expect(tpl).not.toBeNull();
    expect(tpl?.name).toBe("Meine Vorlage");
  });

  it("returns null for a non-existent id", () => {
    resetLocalData();
    expect(getLocalTemplate(999)).toBeNull();
  });
});

// ── createLocalTemplate ───────────────────────────────────────────────────────

describe("createLocalTemplate – Vorlage speichern", () => {
  beforeEach(() => resetLocalData());

  it("creates a template and returns its id", () => {
    const { id } = createLocalTemplate({
      name: "Sommerfest Standard",
      title: "Vereinssommerfest",
      category: "fitness",
      description: "Spaß für alle!",
      location: "Vereinsgelände",
      price: "Kostenlos",
      dress_code: "Freizeitkleidung",
      max_participants: 50,
    });
    expect(id).toBeGreaterThan(0);
    const tpl = getLocalTemplate(id);
    expect(tpl?.name).toBe("Sommerfest Standard");
    expect(tpl?.title).toBe("Vereinssommerfest");
    expect(tpl?.last_used_at).toBeNull();
  });

  it("stores all fields correctly (no date/time fields)", () => {
    const { id } = createLocalTemplate({
      name: "HIIT-Vorlage",
      title: "HIIT Training",
      category: "fitness",
      description: "Hochintensiv",
      location: "Außengelände",
      price: "5 €",
      dress_code: "Sportkleidung & Laufschuhe",
      max_participants: 15,
    });
    const tpl = getLocalTemplate(id)!;
    expect(tpl.category).toBe("fitness");
    expect(tpl.max_participants).toBe(15);
    expect(tpl.price).toBe("5 €");
    // No date/time fields
    expect("date" in tpl).toBe(false);
    expect("time" in tpl).toBe(false);
  });

  it("assigns unique sequential IDs", () => {
    const a = createLocalTemplate({ name: "A", title: "A", category: "fussball", description: "", location: "L", price: "K", dress_code: "", max_participants: 10 });
    const b = createLocalTemplate({ name: "B", title: "B", category: "fitness", description: "", location: "L", price: "K", dress_code: "", max_participants: 10 });
    expect(b.id).toBeGreaterThan(a.id);
  });
});

// ── updateLocalTemplate ───────────────────────────────────────────────────────

describe("updateLocalTemplate – Vorlage bearbeiten", () => {
  beforeEach(() => resetLocalData());

  it("updates all mutable fields", () => {
    resetLocalData([], [], [makeTemplate({ id: 1, name: "Alt", max_participants: 10 })]);
    updateLocalTemplate(1, {
      name: "Aktualisiert",
      title: "Neuer Titel",
      category: "schwimmen",
      description: "Neue Beschreibung",
      location: "Neuer Ort",
      price: "10 €",
      dress_code: "Badebekleidung",
      max_participants: 25,
    });
    const tpl = getLocalTemplate(1)!;
    expect(tpl.name).toBe("Aktualisiert");
    expect(tpl.category).toBe("schwimmen");
    expect(tpl.max_participants).toBe(25);
  });

  it("is a no-op for a non-existent id", () => {
    resetLocalData([], [], [makeTemplate({ id: 1 })]);
    updateLocalTemplate(999, { name: "X", title: "X", category: "fussball", description: "", location: "X", price: "K", dress_code: "", max_participants: 5 });
    // Original is untouched
    expect(getLocalAllTemplates()).toHaveLength(1);
  });
});

// ── deleteLocalTemplate ───────────────────────────────────────────────────────

describe("deleteLocalTemplate – Vorlage löschen", () => {
  beforeEach(() => resetLocalData());

  it("removes the template from the list", () => {
    resetLocalData([], [], [makeTemplate({ id: 1 }), makeTemplate({ id: 2, name: "Zweite" })]);
    deleteLocalTemplate(1);
    const all = getLocalAllTemplates();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(2);
  });

  it("is a no-op for a non-existent id", () => {
    resetLocalData([], [], [makeTemplate({ id: 1 })]);
    deleteLocalTemplate(999);
    expect(getLocalAllTemplates()).toHaveLength(1);
  });
});

// ── touchLocalTemplate – Zuletzt genutzt ─────────────────────────────────────

describe("touchLocalTemplate – last_used_at tracking", () => {
  beforeEach(() => resetLocalData());

  it("sets last_used_at to the current time when used", () => {
    const before = new Date();
    resetLocalData([], [], [makeTemplate({ id: 1, last_used_at: null })]);
    touchLocalTemplate(1);
    const tpl = getLocalTemplate(1)!;
    expect(tpl.last_used_at).not.toBeNull();
    const after = new Date();
    const usedAt = new Date(tpl.last_used_at!);
    expect(usedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 50);
    expect(usedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 50);
  });

  it("updates last_used_at on repeated use", () => {
    resetLocalData([], [], [makeTemplate({ id: 1, last_used_at: "2020-01-01T00:00:00.000Z" })]);
    touchLocalTemplate(1);
    const tpl = getLocalTemplate(1)!;
    expect(new Date(tpl.last_used_at!).getFullYear()).toBeGreaterThan(2020);
  });
});

// ── Event aus Vorlage erstellen ───────────────────────────────────────────────

describe("Event aus Vorlage erstellen – field prefill", () => {
  beforeEach(() => resetLocalData());

  it("prefills event fields from template (without date/time)", () => {
    resetLocalData([], [], [makeTemplate({
      id: 1,
      title: "Vereinstraining",
      category: "fussball",
      description: "Regelmäßiges Training",
      location: "Sportpark",
      price: "Kostenlos",
      dress_code: "Sportkleidung",
      max_participants: 20,
    })]);

    const tpl = getLocalTemplate(1)!;
    // Simulate EventForm applying the template: copy fields, user sets date+time
    const { id } = createLocalEvent({
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      location: tpl.location,
      price: tpl.price,
      dress_code: tpl.dress_code,
      max_participants: tpl.max_participants,
      date: "2099-08-01",
      time: "18:00",
    });

    const event = getLocalAllEvents().find((e) => e.id === id);
    expect(event?.title).toBe("Vereinstraining");
    expect(event?.category).toBe("fussball");
    expect(event?.location).toBe("Sportpark");
    expect(event?.max_participants).toBe(20);
    // date/time come from user input
    expect(event?.date).toBe("2099-08-01");
    expect(event?.time).toBe("18:00");
    // Event starts as draft
    expect(event?.status).toBe("draft");
  });

  it("event fields are independent after creation (editing event does not change template)", () => {
    resetLocalData([], [], [makeTemplate({ id: 1, title: "Original", max_participants: 10 })]);
    const tpl = getLocalTemplate(1)!;

    createLocalEvent({
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      location: tpl.location,
      price: tpl.price,
      dress_code: tpl.dress_code,
      max_participants: tpl.max_participants,
      date: "2099-09-01",
      time: "10:00",
    });

    // Template is unchanged
    expect(getLocalTemplate(1)?.title).toBe("Original");
    expect(getLocalTemplate(1)?.max_participants).toBe(10);
  });
});

// ── Vorlagen-Verwaltung integration ──────────────────────────────────────────

describe("Vorlagen-Verwaltung – full lifecycle", () => {
  beforeEach(() => resetLocalData());

  it("supports full create → edit → duplicate → delete lifecycle", () => {
    // Create
    const { id } = createLocalTemplate({ name: "Original", title: "T", category: "fitness", description: "", location: "L", price: "K", dress_code: "", max_participants: 10 });
    expect(getLocalAllTemplates()).toHaveLength(1);

    // Edit
    updateLocalTemplate(id, { name: "Bearbeitet", title: "T2", category: "fitness", description: "Neu", location: "L2", price: "5 €", dress_code: "", max_participants: 15 });
    expect(getLocalTemplate(id)?.name).toBe("Bearbeitet");

    // Duplicate (simulated as a new create with copied data)
    const tpl = getLocalTemplate(id)!;
    const { id: dupId } = createLocalTemplate({ name: `Kopie von ${tpl.name}`, title: tpl.title, category: tpl.category, description: tpl.description, location: tpl.location, price: tpl.price, dress_code: tpl.dress_code, max_participants: tpl.max_participants });
    expect(getLocalAllTemplates()).toHaveLength(2);
    expect(getLocalTemplate(dupId)?.name).toBe("Kopie von Bearbeitet");

    // Delete original
    deleteLocalTemplate(id);
    expect(getLocalAllTemplates()).toHaveLength(1);
    expect(getLocalTemplate(id)).toBeNull();
    expect(getLocalTemplate(dupId)).not.toBeNull();
  });
});
