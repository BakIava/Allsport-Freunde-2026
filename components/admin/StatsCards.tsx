"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Calendar, Users, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricGrid } from "@/components/ui/MetricGrid";
import { MetricCard, type MetricColor } from "@/components/ui/MetricCard";
import type { AdminStats } from "@/lib/types";

type StatKey = keyof AdminStats;

const statConfig: Array<{
  key: StatKey;
  label: string;
  Icon: React.ElementType;
  color: MetricColor;
  suffix?: string;
}> = [
  { key: "total_events",          label: "Gesamte Events",  Icon: CalendarDays, color: "blue"   },
  { key: "upcoming_events",       label: "Kommende Events", Icon: Calendar,     color: "green"  },
  { key: "total_registrations",   label: "Anmeldungen",     Icon: Users,        color: "amber"  },
  { key: "pending_registrations", label: "Ausstehend",      Icon: Clock,        color: "red"    },
  { key: "avg_utilization",       label: "Ø Auslastung",    Icon: TrendingUp,   color: "purple", suffix: "%" },
];

export default function StatsCards() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MetricGrid>
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-3 md:p-4 h-20" />
          </Card>
        ))}
      </MetricGrid>
    );
  }

  if (!stats) return null;

  return (
    <MetricGrid>
      {statConfig.map((s) => (
        <MetricCard
          key={s.key}
          label={s.label}
          value={s.suffix ? `${stats[s.key]}${s.suffix}` : stats[s.key]}
          color={s.color}
          icon={<s.Icon className="w-4 h-4" />}
        />
      ))}
    </MetricGrid>
  );
}
