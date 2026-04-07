"use client";

import { useState } from "react";
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
  const [status, setStatus] = useState(info.status);
  const [statusChangedAt, setStatusChangedAt] = useState(info.status_changed_at);
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancel = status === "pending" || status === "approved";

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const token = window.location.pathname.split("/").pop();
      const res = await fetch(`/api/status/${token}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Stornieren.");
      } else {
        setStatus("cancelled");
        setStatusChangedAt(new Date().toISOString());
        setConfirmOpen(false);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setCancelling(false);
    }
  }

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
              <StatusBadge status={status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "pending" && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                Deine Anmeldung wird derzeit geprüft. Du erhältst eine E-Mail, sobald sie bestätigt oder abgelehnt wurde.
              </p>
            )}
            {status === "approved" && (
              <div className="space-y-3">
                <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                  Deine Anmeldung wurde bestätigt! Wir freuen uns auf dich.
                </p>
                {info.qr_code && (
                  <div className="border border-gray-100 rounded-lg p-4 text-center bg-white">
                    <p className="text-xs font-medium text-gray-500 mb-3">Dein Check-In QR-Code</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={info.qr_code}
                      alt="Check-In QR-Code"
                      className="mx-auto w-48 h-48 rounded"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Zeige diesen Code am Event-Tag beim Einlass vor.
                    </p>
                    {info.checked_in_at && (
                      <p className="text-xs text-green-600 font-medium mt-2">
                        ✓ Eingecheckt um {formatDateTime(info.checked_in_at)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {status === "rejected" && (
              <div className="text-sm text-red-700 bg-red-50 rounded-lg p-3 space-y-1">
                <p>Deine Anmeldung wurde leider abgelehnt.</p>
                {info.status_note && (
                  <p className="font-medium">Begründung: {info.status_note}</p>
                )}
              </div>
            )}
            {status === "cancelled" && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                Deine Anmeldung wurde storniert.
              </p>
            )}
            {statusChangedAt && (
              <p className="text-xs text-gray-400">
                Zuletzt aktualisiert: {formatDateTime(statusChangedAt)}
              </p>
            )}

            {canCancel && !confirmOpen && (
              <button
                onClick={() => setConfirmOpen(true)}
                className="mt-2 w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 px-4 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Anmeldung stornieren
              </button>
            )}

            {canCancel && confirmOpen && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-red-700 font-medium">
                  Möchtest du deine Anmeldung wirklich stornieren?
                </p>
                <p className="text-xs text-red-600">
                  Diese Aktion kann nicht rückgängig gemacht werden.
                </p>
                {error && (
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="flex-1 text-sm bg-red-600 text-white rounded-lg py-2 px-4 hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelling ? "Wird storniert…" : "Ja, stornieren"}
                  </button>
                  <button
                    onClick={() => { setConfirmOpen(false); setError(null); }}
                    disabled={cancelling}
                    className="flex-1 text-sm border border-gray-200 text-gray-600 rounded-lg py-2 px-4 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
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
