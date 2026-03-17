"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EventForm from "@/components/admin/EventForm";
import type { EventWithRegistrations } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function EditEventPage() {
  const params = useParams();
  const [event, setEvent] = useState<EventWithRegistrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/events/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Event nicht gefunden");
        return r.json();
      })
      .then(setEvent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || "Event nicht gefunden."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Event bearbeiten</h1>
        <p className="text-muted-foreground mt-1">{event.title}</p>
      </div>
      <EventForm event={event} />
    </div>
  );
}
