/**
 * Visual escalation for the incident marker shown in the check-in area.
 * The more recorded incidents a person has, the more prominent the marker.
 *
 * Levels:
 *   0  → no marker
 *   1  → level 1 (gelb)   – einmalig auffällig
 *   2  → level 2 (orange) – mehrfach auffällig
 *   3+ → level 3 (rot)    – stark auffällig
 */
export type IncidentLevel = 0 | 1 | 2 | 3;

export function incidentLevel(count: number | undefined | null): IncidentLevel {
  if (!count || count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

interface IncidentStyle {
  /** Tailwind classes for the badge pill. */
  badge: string;
  /** Tailwind classes for a subtle highlight ring/border on the row. */
  ring: string;
  /** Tailwind class for a small status dot. */
  dot: string;
  label: string;
}

const STYLES: Record<Exclude<IncidentLevel, 0>, IncidentStyle> = {
  1: {
    badge: "bg-yellow-100 text-yellow-800 border border-yellow-300",
    ring: "ring-1 ring-yellow-300",
    dot: "bg-yellow-400",
    label: "Auffällig",
  },
  2: {
    badge: "bg-orange-100 text-orange-800 border border-orange-300",
    ring: "ring-2 ring-orange-300",
    dot: "bg-orange-500",
    label: "Mehrfach auffällig",
  },
  3: {
    badge: "bg-red-100 text-red-800 border border-red-400 font-bold animate-pulse",
    ring: "ring-2 ring-red-400",
    dot: "bg-red-500",
    label: "Stark auffällig",
  },
};

export function incidentStyle(count: number | undefined | null): IncidentStyle | null {
  const level = incidentLevel(count);
  if (level === 0) return null;
  return STYLES[level];
}
