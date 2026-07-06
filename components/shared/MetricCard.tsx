import { ReactNode } from "react";

export type MetricColor =
  | "gray"
  | "green"
  | "blue"
  | "red"
  | "amber"
  | "purple";

export interface MetricCardProps {
  label: string;
  value: number | string;
  /** Small hint text below the value */
  sub?: string;
  color?: MetricColor;
  icon?: ReactNode;
}

const colorStyles: Record<
  MetricColor,
  { card: string; icon: string; value: string }
> = {
  gray:   { card: "bg-gray-50   border-gray-200",   icon: "text-gray-500",   value: "text-gray-900"  },
  green:  { card: "bg-green-50  border-green-200",  icon: "text-green-600",  value: "text-green-800" },
  blue:   { card: "bg-blue-50   border-blue-100",   icon: "text-blue-500",   value: "text-blue-900"  },
  red:    { card: "bg-red-50    border-red-200",    icon: "text-red-500",    value: "text-red-800"   },
  amber:  { card: "bg-amber-50  border-amber-200",  icon: "text-amber-600",  value: "text-amber-900" },
  purple: { card: "bg-purple-50 border-purple-200", icon: "text-purple-500", value: "text-purple-900"},
};

/**
 * MetricCard – Kachel für eine einzelne Kennzahl. Gedacht für MetricGrid.
 *
 * @example
 * <MetricCard
 *   label="Teilnehmer"
 *   value={42}
 *   sub="von 50 max."
 *   color="blue"
 *   icon={<UsersIcon className="w-4 h-4" />}
 * />
 */
export function MetricCard({
  label,
  value,
  sub,
  color = "gray",
  icon,
}: MetricCardProps) {
  const s = colorStyles[color];
  return (
    <div className={`rounded-xl border p-3 md:p-4 space-y-1.5 ${s.card}`}>
      <div
        className={`flex items-center gap-1.5 text-xs md:text-sm font-medium ${s.icon}`}
      >
        {icon}
        {label}
      </div>
      <p className={`text-2xl md:text-3xl font-bold tabular-nums ${s.value}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
