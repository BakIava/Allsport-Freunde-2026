"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { Calendar, Clock, MapPin, Euro, Shirt, User, Users, Mail } from "lucide-react";
import type { RegistrationStatusInfo } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StatusPage({ info }: { info: RegistrationStatusInfo }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Anmeldestatus</h1>
          <p className="text-gray-500 mt-1">Allsport Freunde 2026 e.V.</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Status</CardTitle>
              <StatusBadge status={info.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {info.status === "pending" && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                Deine Anmeldung wird derzeit geprüft. Du erhältst eine E-Mail, sobald sie bestätigt oder abgelehnt wurde.
              </p>
            )}
            {info.status === "approved" && (
              <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                Deine Anmeldung wurde bestätigt! Wir freuen uns auf dich.
              </p>
            )}
            {info.status === "rejected" && (
              <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
                <p>Deine Anmeldung wurde leider abgelehnt.</p>
                {info.status_note && (
                  <p className="font-medium">Begründung: {info.status_note}</p>
                )}
              </div>
            )}
            {info.status_changed_at && (
              <p className="text-xs text-gray-400">
                Zuletzt aktualisiert: {formatDateTime(info.status_changed_at)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Event-Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <h3 className="font-bold text-gray-900">{info.event_title}</h3>
            <p className="text-sm text-gray-500">{categoryLabels[info.event_category] || info.event_category}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(info.event_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{info.event_time} Uhr</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{info.event_location}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Euro className="w-4 h-4 text-gray-400" />
                <span>{info.event_price}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Shirt className="w-4 h-4 text-gray-400" />
                <span>{info.event_dress_code}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deine Daten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <span>{info.first_name} {info.last_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{info.email}</span>
            </div>
            {info.guests > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                <span>{info.guests} Begleitperson{info.guests > 1 ? "en" : ""}</span>
              </div>
            )}
            <p className="text-xs text-gray-400 pt-2">
              Angemeldet am {formatDateTime(info.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
