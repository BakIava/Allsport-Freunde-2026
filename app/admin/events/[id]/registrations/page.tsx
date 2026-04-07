"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import RegistrationTable from "@/components/admin/RegistrationTable";
import { ArrowLeft, Loader2, QrCode, LayoutDashboard } from "lucide-react";
import type { EventWithRegistrations } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

export default function EventRegistrationsPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const [event, setEvent] = useState<EventWithRegistrations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}`)
      .then((r) => r.json())
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (!event) {
    return <p className="text-center py-20 text-red-600">Event nicht gefunden.</p>;
  }

  const percentage = (event.current_participants / event.max_participants) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin/events">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anmeldungen</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/events/${eventId}/dashboard`}>
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Check-In Dashboard
            </Button>
          </Link>
          <Link href={`/admin/events/${eventId}/scanner`}>
            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <QrCode className="w-4 h-4" />
              Scanner
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Kategorie: </span>
              <Badge variant={event.category as "fussball" | "fitness" | "schwimmen"}>
                {categoryLabels[event.category]}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Datum: </span>
              <span className="font-medium">{formatDate(event.date)} um {event.time} Uhr</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ort: </span>
              <span className="font-medium">{event.location}</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Auslastung (bestätigt)</span>
              <span className="font-medium">
                {event.current_participants} / {event.max_participants} Plätzen belegt
                {event.pending_participants ? ` (${event.pending_participants} ausstehend)` : ""}
              </span>
            </div>
            <Progress value={percentage} />
          </div>
        </CardContent>
      </Card>

      <RegistrationTable eventId={eventId} />
    </div>
  );
}
