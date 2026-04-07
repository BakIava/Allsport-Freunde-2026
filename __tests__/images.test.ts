/**
 * Tests for the Bilder für Veranstaltungen (Event Images) feature.
 *
 * Uses the in-memory local-data layer only – no DB or network required.
 * resetLocalData() resets all shared state before each test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resetLocalData,
  getLocalAllEvents,
  getLocalEvents,
  getLocalEventFull,
  createLocalEvent,
  updateLocalEvent,
  deleteLocalEvent,
  setLocalEventImages,
} from "../lib/local-data";
import type { EventWithRegistrations, EventImage } from "../lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<EventWithRegistrations> = {}): EventWithRegistrations {
  return {
    id: 1,
    title: "Test Event",
    category: "fussball",
    description: "Beschreibung",
    date: "2099-06-01",
    time: "15:00",
    location: "Testort",
    price: "Kostenlos",
    dress_code: "Sportkleidung",
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

function makeImage(overrides: Partial<EventImage> = {}): EventImage {
  return {
    id: 1,
    event_id: 1,
    url: "https://beispiel.de/bild.jpg",
    alt_text: "Ein Testbild",
    position: 0,
    ...overrides,
  };
}

// ── setLocalEventImages ───────────────────────────────────────────────────────

describe("setLocalEventImages", () => {
  beforeEach(() => resetLocalData());

  it("attaches images to an event", () => {
    resetLocalData([makeEvent({ id: 1 })]);
    setLocalEventImages(1, [
      { url: "https://a.de/1.jpg", alt_text: "Bild 1", position: 0 },
      { url: "https://a.de/2.jpg", alt_text: "Bild 2", position: 1 },
    ]);
    const event = getLocalEventFull(1)!;
    expect(event.images).toHaveLength(2);
    expect(event.images![0].url).toBe("https://a.de/1.jpg");
    expect(event.images![1].url).toBe("https://a.de/2.jpg");
  });

  it("replaces existing images on subsequent calls", () => {
    resetLocalData([makeEvent({ id: 1 })]);
    setLocalEventImages(1, [{ url: "https://a.de/old.jpg", alt_text: "", position: 0 }]);
    setLocalEventImages(1, [{ url: "https://a.de/new.jpg", alt_text: "Neu", position: 0 }]);
    const event = getLocalEventFull(1)!;
    expect(event.images).toHaveLength(1);
    expect(event.images![0].url).toBe("https://a.de/new.jpg");
  });

  it("clears images when called with empty array", () => {
    resetLocalData([makeEvent({ id: 1 })], [], [], [
      makeImage({ id: 1, event_id: 1 }),
    ]);
    setLocalEventImages(1, []);
    expect(getLocalEventFull(1)?.images).toHaveLength(0);
  });

  it("sorts images by position", () => {
    resetLocalData([makeEvent({ id: 1 })]);
    setLocalEventImages(1, [
      { url: "https://a.de/c.jpg", alt_text: "C", position: 2 },
      { url: "https://a.de/a.jpg", alt_text: "A", position: 0 },
      { url: "https://a.de/b.jpg", alt_text: "B", position: 1 },
    ]);
    const imgs = getLocalEventFull(1)!.images!;
    expect(imgs[0].alt_text).toBe("A");
    expect(imgs[1].alt_text).toBe("B");
    expect(imgs[2].alt_text).toBe("C");
  });
});

// ── resetLocalData with images ────────────────────────────────────────────────

describe("resetLocalData – image seeding", () => {
  it("seeds images and attaches them to events", () => {
    resetLocalData(
      [makeEvent({ id: 1 })],
      [],
      [],
      [makeImage({ id: 1, event_id: 1, url: "https://a.de/seeded.jpg" })]
    );
    const event = getLocalEventFull(1)!;
    expect(event.images).toHaveLength(1);
    expect(event.images![0].url).toBe("https://a.de/seeded.jpg");
  });

  it("event with no images returns empty images array", () => {
    resetLocalData([makeEvent({ id: 1 })]);
    expect(getLocalEventFull(1)?.images).toHaveLength(0);
  });
});

// ── createLocalEvent with images ──────────────────────────────────────────────

describe("createLocalEvent – image prefill", () => {
  beforeEach(() => resetLocalData());

  it("creates event with images", () => {
    const { id } = createLocalEvent({
      title: "Mit Bildern",
      category: "fussball",
      description: "",
      date: "2099-07-01",
      time: "10:00",
      location: "Ort",
      price: "Kostenlos",
      dress_code: "",
      max_participants: 10,
      images: [
        { url: "https://a.de/1.jpg", alt_text: "Eins", position: 0 },
        { url: "https://a.de/2.jpg", alt_text: "Zwei", position: 1 },
      ],
    });
    const event = getLocalEventFull(id)!;
    expect(event.images).toHaveLength(2);
    expect(event.images![0].alt_text).toBe("Eins");
    expect(event.images![1].alt_text).toBe("Zwei");
  });

  it("creates event without images when not provided", () => {
    const { id } = createLocalEvent({
      title: "Ohne Bilder",
      category: "fitness",
      description: "",
      date: "2099-08-01",
      time: "09:00",
      location: "Ort",
      price: "5 €",
      dress_code: "",
      max_participants: 5,
    });
    expect(getLocalEventFull(id)?.images).toHaveLength(0);
  });
});

// ── updateLocalEvent – image replacement ──────────────────────────────────────

describe("updateLocalEvent – image replacement", () => {
  beforeEach(() => resetLocalData());

  it("replaces images when updating event", () => {
    resetLocalData([makeEvent({ id: 1 })], [], [], [
      makeImage({ id: 1, event_id: 1, url: "https://a.de/old.jpg" }),
    ]);
    updateLocalEvent(1, {
      title: "Geändert",
      category: "fussball",
      description: "",
      date: "2099-09-01",
      time: "12:00",
      location: "Neu",
      price: "Kostenlos",
      dress_code: "",
      max_participants: 20,
      images: [{ url: "https://a.de/new.jpg", alt_text: "Neu", position: 0 }],
    });
    const event = getLocalEventFull(1)!;
    expect(event.images).toHaveLength(1);
    expect(event.images![0].url).toBe("https://a.de/new.jpg");
  });

  it("leaves images unchanged when images not provided in update", () => {
    resetLocalData([makeEvent({ id: 1 })], [], [], [
      makeImage({ id: 1, event_id: 1, url: "https://a.de/keep.jpg" }),
    ]);
    updateLocalEvent(1, {
      title: "Nur Felder",
      category: "fussball",
      description: "",
      date: "2099-10-01",
      time: "08:00",
      location: "Ort",
      price: "Kostenlos",
      dress_code: "",
      max_participants: 15,
    });
    expect(getLocalEventFull(1)?.images).toHaveLength(1);
  });
});

// ── deleteLocalEvent – cascade ────────────────────────────────────────────────

describe("deleteLocalEvent – image cascade", () => {
  it("deletes images when event is deleted", () => {
    resetLocalData(
      [makeEvent({ id: 1 }), makeEvent({ id: 2, title: "Zweites" })],
      [],
      [],
      [
        makeImage({ id: 1, event_id: 1 }),
        makeImage({ id: 2, event_id: 2, url: "https://b.de/2.jpg" }),
      ]
    );
    deleteLocalEvent(1);
    expect(getLocalEventFull(1)).toBeNull();
    // Event 2's image is untouched
    expect(getLocalEventFull(2)?.images).toHaveLength(1);
  });
});

// ── Images included in event queries ─────────────────────────────────────────

describe("Images in event queries", () => {
  beforeEach(() => resetLocalData());

  it("getLocalAllEvents includes images", () => {
    resetLocalData(
      [makeEvent({ id: 1 })],
      [],
      [],
      [makeImage({ id: 1, event_id: 1, url: "https://x.de/img.jpg" })]
    );
    const events = getLocalAllEvents();
    expect(events[0].images).toHaveLength(1);
  });

  it("getLocalEvents (public) includes images for published upcoming events", () => {
    resetLocalData(
      [makeEvent({ id: 1, status: "published", date: "2099-06-01" })],
      [],
      [],
      [makeImage({ id: 1, event_id: 1, url: "https://x.de/pub.jpg" })]
    );
    const events = getLocalEvents();
    expect(events[0].images).toHaveLength(1);
    expect(events[0].images![0].url).toBe("https://x.de/pub.jpg");
  });

  it("getLocalEvents does not include images of other events", () => {
    resetLocalData(
      [makeEvent({ id: 1, status: "published", date: "2099-06-01" }), makeEvent({ id: 2, status: "published", date: "2099-07-01" })],
      [],
      [],
      [
        makeImage({ id: 1, event_id: 1, url: "https://a.de/1.jpg" }),
        makeImage({ id: 2, event_id: 2, url: "https://b.de/2.jpg" }),
      ]
    );
    const events = getLocalEvents();
    const e1 = events.find((e) => e.id === 1)!;
    const e2 = events.find((e) => e.id === 2)!;
    expect(e1.images).toHaveLength(1);
    expect(e1.images![0].url).toBe("https://a.de/1.jpg");
    expect(e2.images).toHaveLength(1);
    expect(e2.images![0].url).toBe("https://b.de/2.jpg");
  });
});

// ── URL validation helper (pure logic) ───────────────────────────────────────

describe("URL validation logic", () => {
  it("recognises https URLs as potentially valid", () => {
    const url = "https://example.com/image.jpg";
    expect(url.startsWith("https://") || url.startsWith("http://")).toBe(true);
  });

  it("rejects non-http URLs", () => {
    const url = "ftp://example.com/image.jpg";
    expect(url.startsWith("https://") || url.startsWith("http://")).toBe(false);
  });

  it("rejects empty strings", () => {
    const url = "";
    expect(url.trim().length).toBe(0);
  });
});
