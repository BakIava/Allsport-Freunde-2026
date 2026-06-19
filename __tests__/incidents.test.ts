/**
 * Tests for the Vorfälle / Incident-Markierung feature.
 *
 * Covers the pure helpers:
 *  - incidentLevel / incidentStyle   (escalating marker)
 *  - incidentNameKey                  (cross-event person matching)
 *
 * No DB or network required.
 */

import { describe, it, expect } from "vitest";
import { incidentLevel, incidentStyle } from "../lib/incident-marker";
import { incidentNameKey } from "../lib/db/incidents";

describe("incidentLevel", () => {
  it("returns 0 for no incidents", () => {
    expect(incidentLevel(0)).toBe(0);
    expect(incidentLevel(undefined)).toBe(0);
    expect(incidentLevel(null)).toBe(0);
    expect(incidentLevel(-1)).toBe(0);
  });

  it("escalates with the number of incidents", () => {
    expect(incidentLevel(1)).toBe(1);
    expect(incidentLevel(2)).toBe(2);
    expect(incidentLevel(3)).toBe(3);
    expect(incidentLevel(10)).toBe(3); // capped at level 3
  });
});

describe("incidentStyle", () => {
  it("is null when there are no incidents", () => {
    expect(incidentStyle(0)).toBeNull();
    expect(incidentStyle(undefined)).toBeNull();
  });

  it("returns escalating styles with distinct colours", () => {
    const one = incidentStyle(1);
    const two = incidentStyle(2);
    const three = incidentStyle(5);
    expect(one?.badge).toContain("yellow");
    expect(two?.badge).toContain("orange");
    expect(three?.badge).toContain("red");
    // strongest level is visually loudest
    expect(three?.badge).toContain("animate-pulse");
  });
});

describe("incidentNameKey", () => {
  it("normalises case and whitespace so the same person matches across events", () => {
    expect(incidentNameKey("Max", "Mustermann")).toBe("max mustermann");
    expect(incidentNameKey("  MAX ", " Mustermann  ")).toBe("max mustermann");
    expect(incidentNameKey("max", "mustermann")).toBe(incidentNameKey("Max", "Mustermann"));
  });

  it("collapses internal whitespace", () => {
    expect(incidentNameKey("Anna  Lena", "von  Berg")).toBe("anna lena von berg");
  });
});
