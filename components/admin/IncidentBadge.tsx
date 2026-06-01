"use client";

import { AlertTriangle } from "lucide-react";
import { incidentStyle } from "@/lib/incident-marker";

interface Props {
  count: number | undefined | null;
  /** "sm" = compact (default), "xs" = tiny inline marker. */
  size?: "sm" | "xs";
  onClick?: () => void;
  className?: string;
}

/**
 * Marker shown next to a person's name in the check-in area when incidents
 * have been recorded for that person. The colour escalates with the count.
 */
export default function IncidentBadge({ count, size = "sm", onClick, className = "" }: Props) {
  const style = incidentStyle(count);
  if (!style) return null;

  const iconSize = size === "xs" ? "w-3 h-3" : "w-3.5 h-3.5";
  const padding = size === "xs" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-xs";
  const interactive = onClick
    ? "cursor-pointer hover:brightness-95 transition"
    : "";

  return (
    <span
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={`${style.label} · ${count} ${count === 1 ? "Vorfall" : "Vorfälle"}`}
      className={`inline-flex items-center gap-0.5 rounded font-semibold leading-none ${padding} ${style.badge} ${interactive} ${className}`}
    >
      <AlertTriangle className={iconSize} />
      {count}
    </span>
  );
}
