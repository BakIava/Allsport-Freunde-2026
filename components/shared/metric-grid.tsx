import { ReactNode } from "react";

interface MetricGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * MetricGrid – responsives Grid-Layout für MetricCard-Kinder.
 * 2 Spalten auf xs, 3 auf md, 4 auf lg.
 *
 * @example
 * <MetricGrid>
 *   <MetricCard label="Teilnehmer" value={42} color="blue" />
 *   <MetricCard label="Events"     value={7}  color="green" />
 *   <MetricCard label="Umsatz"     value="1.240 €" color="amber" />
 * </MetricGrid>
 */
export function MetricGrid({ children, className = "" }: MetricGridProps) {
  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {children}
      </div>
    </div>
  );
}
