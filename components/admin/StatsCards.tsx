"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Calendar, Users, TrendingUp, Clock, Loader2 } from "lucide-react";
import type { AdminStats } from "@/lib/types";

const statConfig = [
  { key: "total_events" as const, label: "Gesamte Events", icon: CalendarDays, color: "text-blue-600", bg: "bg-blue-100" },
  { key: "upcoming_events" as const, label: "Kommende Events", icon: Calendar, color: "text-green-600", bg: "bg-green-100" },
  { key: "total_registrations" as const, label: "Anmeldungen", icon: Users, color: "text-orange-600", bg: "bg-orange-100" },
  { key: "pending_registrations" as const, label: "Ausstehend", icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
  { key: "avg_utilization" as const, label: "Ø Auslastung", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100", suffix: "%" },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statConfig.map((s) => (
        <Card key={s.key}>
          <CardContent className="p-6 min-h-20 h-full">
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold truncate">
                {stats[s.key]}
                {s.suffix || ""}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
