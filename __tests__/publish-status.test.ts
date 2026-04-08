/**
 * Tests for the Event publication status feature.
 *
 * Uses the in-memory local-data layer (no real DB needed).
 * Each test resets shared state via resetLocalData() before running.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetLocalData,
  getLocalEvents,
  getLocalAllEvents,
  createLocalEvent,
  publishLocalEvent,
  unpublishLocalEvent,
  createLocalRegistration,
} from "../lib/local-data";
import type { EventWithRegistrations, Registration } from "../lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];
const FUTURE = "2099-12-31";
const PAST = "2000-01-01";

function makeEvent(overrides: Partial<EventWithRegistrations> = {}): EventWithRegistrations {
  return {
    id: 1,
    title: "Test Event",
    category: "fussball",
    description: "",
    date: FUTURE,
    time: "10:00",
    location: "Testort",
    parking_location: null,
    price: "Kostenlos",
    dress_code: "",
    max_participants: 20,
    status: "published",
    cancellation_reason: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    current_participants: 0,
    pending_participants: 0,
    ...overrides,
  };
}

// ── Visibility: getLocalEvents (public) ──────────────────────────────────────

describe("getLocalEvents – public visibility", () => {
  beforeEach(() => resetLocalData());

  it("returns only published future events", () => {
    resetLocalData([
      makeEvent({ id: 1, status: "published", date: FUTURE }),
      makeEvent({ id: 2, status: "draft", date: FUTURE }),
      makeEvent({ id: 3, status: "cancelled", date: FUTURE }),
      makeEvent({ id: 4, status: "published", date: PAST }),   // past → excluded
    ]);

    const visible = getLocalEvents();
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(1);
  });

  it("returns empty array when no published future events exist", () => {
    resetLocalData([makeEvent({ id: 1, status: "draft", date: FUTURE })]);
    expect(getLocalEvents()).toHaveLength(0);
  });

  it("sorts published events by date ascending", () => {
    resetLocalData([
      makeEvent({ id: 1, status: "published", date: "2099-06-01" }),
      makeEvent({ id: 2, status: "published", date: "2099-03-01" }),
      makeEvent({ id: 3, status: "published", date: "2099-09-01" }),
    ]);
    const visible = getLocalEvents();
    expect(visible.map((e) => e.id)).toEqual([2, 1, 3]);
  });
});

// ── Admin split view: getLocalAllEvents ──────────────────────────────────────

describe("getLocalAllEvents – admin split view", () => {
  beforeEach(() => resetLocalData());

  it("returns all events regardless of status", () => {
    resetLocalData([
      makeEvent({ id: 1, status: "published" }),
      makeEvent({ id: 2, status: "draft" }),
      makeEvent({ id: 3, status: "cancelled" }),
    ]);
    expect(getLocalAllEvents()).toHaveLength(3);
  });

  it("allows caller to split into published and draft sections", () => {
    resetLocalData([
      makeEvent({ id: 1, status: "published", date: "2099-06-01" }),
      makeEvent({ id: 2, status: "draft", date: "2099-03-01", created_at: "2026-01-01T00:00:00.000Z" }),
      makeEvent({ id: 3, status: "draft", date: "2099-09-01", created_at: "2026-02-01T00:00:00.000Z" }),
    ]);

    const all = getLocalAllEvents();
    const published = all.filter((e) => e.status !== "draft");
    const drafts = all.filter((e) => e.status === "draft").sort((a, b) => b.created_at.localeCompare(a.created_at));

    expect(published).toHaveLength(1);
    expect(published[0].id).toBe(1);

    expect(drafts).toHaveLength(2);
    // Most recently created draft first
    expect(drafts[0].id).toBe(3);
    expect(drafts[1].id).toBe(2);
  });
});

// ── createLocalEvent defaults to draft ───────────────────────────────────────

describe("createLocalEvent", () => {
  beforeEach(() => resetLocalData());

  it("creates event as draft by default", () => {
    const { id } = createLocalEvent({
      title: "Neu", category: "fitness", description: "", date: FUTURE,
      time: "09:00", location: "Halle", price: "5 €", dress_code: "", max_participants: 10,
    });
    const all = getLocalAllEvents();
    const event = all.find((e) => e.id === id);
    expect(event?.status).toBe("draft");
    expect(event?.published_at).toBeNull();
  });

  it("creates event as published when publish=true", () => {
    const { id } = createLocalEvent({
      title: "Sofort", category: "fitness", description: "", date: FUTURE,
      time: "09:00", location: "Halle", price: "5 €", dress_code: "", max_participants: 10,
      publish: true,
    });
    const event = getLocalAllEvents().find((e) => e.id === id);
    expect(event?.status).toBe("published");
    expect(event?.published_at).not.toBeNull();
  });

  it("draft event is NOT visible on public page", () => {
    createLocalEvent({
      title: "Entwurf", category: "fussball", description: "", date: FUTURE,
      time: "10:00", location: "Park", price: "Kostenlos", dress_code: "", max_participants: 20,
    });
    const publicEvents = getLocalEvents();
    expect(publicEvents.find((e) => e.title === "Entwurf")).toBeUndefined();
  });
});

// ── publishLocalEvent ─────────────────────────────────────────────────────────

describe("publishLocalEvent", () => {
  beforeEach(() => resetLocalData());

  it("transitions draft → published and sets published_at", () => {
    resetLocalData([makeEvent({ id: 1, status: "draft", published_at: null })]);

    const result = publishLocalEvent(1);
    expect(result.success).toBe(true);

    const event = getLocalAllEvents().find((e) => e.id === 1);
    expect(event?.status).toBe("published");
    expect(event?.published_at).not.toBeNull();
  });

  it("makes the event visible on the public page after publishing", () => {
    resetLocalData([makeEvent({ id: 1, status: "draft", published_at: null, date: FUTURE })]);
    expect(getLocalEvents()).toHaveLength(0);

    publishLocalEvent(1);
    expect(getLocalEvents()).toHaveLength(1);
  });

  it("returns success=false for non-existent event", () => {
    resetLocalData();
    const result = publishLocalEvent(999);
    expect(result.success).toBe(false);
  });

  it("publishing an already-published event is idempotent", () => {
    resetLocalData([makeEvent({ id: 1, status: "published" })]);
    const result = publishLocalEvent(1);
    expect(result.success).toBe(true);
    expect(getLocalAllEvents()[0].status).toBe("published");
  });
});

// ── unpublishLocalEvent ───────────────────────────────────────────────────────

describe("unpublishLocalEvent", () => {
  beforeEach(() => resetLocalData());

  it("transitions published → draft and clears published_at", () => {
    resetLocalData([makeEvent({ id: 1, status: "published" })]);

    const result = unpublishLocalEvent(1);
    expect(result.success).toBe(true);

    const event = getLocalAllEvents().find((e) => e.id === 1);
    expect(event?.status).toBe("draft");
    expect(event?.published_at).toBeNull();
  });

  it("removes event from public page after unpublishing", () => {
    resetLocalData([makeEvent({ id: 1, status: "published", date: FUTURE })]);
    expect(getLocalEvents()).toHaveLength(1);

    unpublishLocalEvent(1);
    expect(getLocalEvents()).toHaveLength(0);
  });

  it("blocks unpublish when registrations exist and returns count", () => {
    resetLocalData([makeEvent({ id: 1, status: "published" })]);
    // Add a registration for event 1
    createLocalRegistration({
      event_id: 1, first_name: "Max", last_name: "Muster", email: "max@test.de",
      phone: "0151", guests: 0, status_token: "abc-token",
    });

    const result = unpublishLocalEvent(1);
    expect(result.success).toBe(false);
    expect(result.registrationCount).toBeGreaterThan(0);

    // Event should still be published
    const event = getLocalAllEvents().find((e) => e.id === 1);
    expect(event?.status).toBe("published");
  });

  it("returns success=false for non-existent event", () => {
    resetLocalData();
    const result = unpublishLocalEvent(999);
    expect(result.success).toBe(false);
  });
});

// ── Status transition: published → cancelled ──────────────────────────────────

describe("cancelled event visibility", () => {
  it("cancelled event does NOT appear in public listing", () => {
    resetLocalData([makeEvent({ id: 1, status: "cancelled", date: FUTURE })]);
    expect(getLocalEvents()).toHaveLength(0);
  });

  it("cancelled event DOES appear in admin listing", () => {
    resetLocalData([makeEvent({ id: 1, status: "cancelled", date: FUTURE })]);
    expect(getLocalAllEvents()).toHaveLength(1);
  });
});
