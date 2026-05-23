"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { Calendar, Clock, MapPin, Euro, Shirt, Mail, Users, X, CheckCircle2 } from "lucide-react";
import type { RegistrationStatusInfo, RegistrationPerson, RegistrationStatus } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-DE", {
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

interface PersonRowProps {
  person: RegistrationPerson;
  index: number;
  token: string;
  registrationStatus: RegistrationStatus;
  onCancelled: (personId: string, allCancelled: boolean) => void;
}

function PersonRow({ person, index, token, registrationStatus, onCancelled }: PersonRowProps) {
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCancelled = !!person.cancelled_at;
  const canCancel =
    !isCancelled &&
    (registrationStatus === "pending" || registrationStatus === "approved");

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/status/${token}/cancel-person/${person.id}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Stornieren.");
      } else {
        onCancelled(person.id, data.allCancelled);
        setConfirmOpen(false);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        isCancelled ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${isCancelled ? "line-through text-gray-400" : "text-gray-900"}`}>
              {person.first_name} {person.last_name}
              {index === 0 && <span className="ml-1.5 text-xs text-gray-400 font-normal">(du)</span>}
            </p>
            {person.checked_in_at && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Eingecheckt {formatDateTime(person.checked_in_at)}
              </p>
            )}
            {isCancelled && (
              <p className="text-xs text-gray-400 mt-0.5">
                Storniert {formatDateTime(person.cancelled_at!)}
              </p>
            )}
          </div>
        </div>

        {canCancel && !confirmOpen && (
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex-shrink-0 text-xs text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
            title="Person stornieren"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {isCancelled && (
          <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Storniert
          </span>
        )}
      </div>

      {confirmOpen && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-red-700 font-medium">
            {person.first_name} {person.last_name} wirklich stornieren?
          </p>
          {error && <p className="text-xs text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 text-xs bg-red-600 text-white rounded-lg py-1.5 px-3 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {cancelling ? "Wird storniert…" : "Ja, stornieren"}
            </button>
            <button
              onClick={() => { setConfirmOpen(false); setError(null); }}
              disabled={cancelling}
              className="flex-1 text-xs border border-gray-200 text-gray-600 rounded-lg py-1.5 px-3 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StatusPage({
  info,
  justCancelled = false,
}: {
  info: RegistrationStatusInfo;
  justCancelled?: boolean;
}) {
  const token = typeof window !== "undefined"
    ? window.location.pathname.split("/").pop() ?? ""
    : "";

  const [status, setStatus] = useState<RegistrationStatus>(info.status);
  const [statusChangedAt, setStatusChangedAt] = useState(info.status_changed_at);
  const [persons, setPersons] = useState<RegistrationPerson[]>(info.persons ?? []);
  const [cancelling, setCancelling] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePersons = persons.filter((p) => !p.cancelled_at);
  const canCancel = status === "pending" || status === "approved";

  function handlePersonCancelled(personId: string, allCancelled: boolean) {
    const now = new Date().toISOString();
    setPersons((prev) =>
      prev.map((p) => (p.id === personId ? { ...p, cancelled_at: now } : p))
    );
    if (allCancelled) {
      setStatus("cancelled");
      setStatusChangedAt(now);
    }
  }

  async function handleCancelAll() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/status/${token}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Fehler beim Stornieren.");
      } else {
        const now = new Date().toISOString();
        setStatus("cancelled");
        setStatusChangedAt(now);
        setPersons((prev) => prev.map((p) => ({ ...p, cancelled_at: p.cancelled_at ?? now })));
        setConfirmAllOpen(false);
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

        {justCancelled && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
            ✓ Deine Anmeldung wurde erfolgreich storniert.
          </div>
        )}

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
          </CardContent>
        </Card>

        {/* Persons card */}
        {persons.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Angemeldete Personen
                  <span className="text-sm font-normal text-gray-400">
                    ({activePersons.length} aktiv)
                  </span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {persons.map((person, idx) => (
                <PersonRow
                  key={person.id}
                  person={person}
                  index={idx}
                  token={token}
                  registrationStatus={status}
                  onCancelled={handlePersonCancelled}
                />
              ))}

              {/* Cancel all button — only show when multiple active persons remain */}
              {canCancel && activePersons.length > 1 && !confirmAllOpen && (
                <button
                  onClick={() => setConfirmAllOpen(true)}
                  className="mt-2 w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 px-4 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  Alle stornieren
                </button>
              )}

              {/* Cancel all when only 1 person */}
              {canCancel && activePersons.length === 1 && persons.length === 1 && !confirmAllOpen && (
                <button
                  onClick={() => setConfirmAllOpen(true)}
                  className="mt-2 w-full text-sm text-gray-500 border border-gray-200 rounded-lg py-2 px-4 hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  Anmeldung stornieren
                </button>
              )}

              {confirmAllOpen && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-red-700 font-medium">
                    {activePersons.length > 1
                      ? `Alle ${activePersons.length} Personen wirklich stornieren?`
                      : "Anmeldung wirklich stornieren?"}
                  </p>
                  <p className="text-xs text-red-600">
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  {error && <p className="text-xs text-red-700 font-medium">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelAll}
                      disabled={cancelling}
                      className="flex-1 text-sm bg-red-600 text-white rounded-lg py-2 px-4 hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {cancelling ? "Wird storniert…" : "Ja, stornieren"}
                    </button>
                    <button
                      onClick={() => { setConfirmAllOpen(false); setError(null); }}
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
        )}

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
            <CardTitle className="text-lg">Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{info.email}</span>
            </div>
            <p className="text-xs text-gray-400 pt-2">
              Angemeldet am {formatDateTime(info.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
