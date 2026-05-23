"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventWithRegistrations } from "@/lib/types";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";

interface PersonEntry {
  firstName: string;
  lastName: string;
}

interface RegistrationModalProps {
  event: EventWithRegistrations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RegistrationModal({
  event,
  open,
  onOpenChange,
  onSuccess,
}: RegistrationModalProps) {
  const maxPerEmail = (event as { max_per_email?: number } & typeof event)?.max_per_email ?? 5;

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [persons, setPersons] = useState<PersonEntry[]>([{ firstName: "", lastName: "" }]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusToken, setStatusToken] = useState<string | null>(null);

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setPersons([{ firstName: "", lastName: "" }]);
    setAccepted(false);
    setError(null);
    setSuccess(false);
    setStatusToken(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const addPerson = () => {
    if (persons.length >= maxPerEmail) return;
    setPersons((prev) => [...prev, { firstName: "", lastName: "" }]);
  };

  const removePerson = (index: number) => {
    if (persons.length <= 1) return;
    setPersons((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePerson = (index: number, field: "firstName" | "lastName", value: string) => {
    setPersons((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!accepted) {
      setError("Bitte akzeptiere die Teilnahmebedingungen.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          email,
          phone,
          persons,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setSuccess(true);
      setStatusToken(data.status_token || null);
      onSuccess();
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Anmeldung eingegangen!
            </h3>
            <p className="text-gray-600 mb-1">
              Deine Anmeldung wird nun geprüft:
            </p>
            <p className="font-semibold text-gray-900 mb-4">{event.title}</p>
            <div className="text-sm text-gray-500 space-y-1 mb-4">
              <p>
                {new Date(event.date + "T00:00:00").toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                um {event.time} Uhr
              </p>
              <p>{event.location}</p>
              {persons.length > 1 && (
                <p>{persons.length} Personen angemeldet</p>
              )}
            </div>
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
              Du erhältst eine E-Mail, sobald deine Anmeldung bestätigt wurde.
            </p>
            {statusToken && (
              <a
                href={`/status/${statusToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline block mb-4"
              >
                Status deiner Anmeldung ansehen
              </a>
            )}
            <Button onClick={() => handleClose(false)} className="rounded-full">
              Schließen
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Anmeldung: {event.title}</DialogTitle>
              <DialogDescription>
                Fülle das Formular aus, um dich für dieses Event anzumelden.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@beispiel.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer (WhatsApp) *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  maxLength={20}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0151 12345678"
                />
              </div>

              {/* Personen-Sektion */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label className="text-sm font-medium">
                    Personen
                  </Label>
                  <span className="text-xs text-gray-400">
                    max. {maxPerEmail} pro E-Mail
                  </span>
                </div>

                {persons.map((person, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        required
                        value={person.firstName}
                        maxLength={50}
                        onChange={(e) => updatePerson(index, "firstName", e.target.value)}
                        placeholder="Vorname"
                      />
                      <Input
                        required
                        value={person.lastName}
                        maxLength={50}
                        onChange={(e) => updatePerson(index, "lastName", e.target.value)}
                        placeholder="Nachname"
                      />
                    </div>
                    {persons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePerson(index)}
                        className="mt-1 p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        title="Person entfernen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {persons.length < maxPerEmail && (
                  <button
                    type="button"
                    onClick={addPerson}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Person hinzufügen
                  </button>
                )}
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="accepted"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <Label htmlFor="accepted" className="text-sm text-gray-600 cursor-pointer">
                  Ich akzeptiere die Teilnahmebedingungen und bin damit
                  einverstanden, dass meine Daten zur Organisation des Events
                  verwendet werden. *
                </Label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  "Anmeldung absenden"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
