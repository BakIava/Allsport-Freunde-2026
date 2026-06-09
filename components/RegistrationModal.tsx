"use client";

import { useState, useRef } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
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
import { CheckCircle2, Loader2, Plus, X, Users } from "lucide-react";
import { LastNameInput } from "@/components/ui/LastNameInput";
import HoneypotFields from "@/components/HoneypotFields";

interface Person {
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [persons, setPersons] = useState<Person[]>([{ firstName: "", lastName: "" }]);
  const firstNameRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [statusToken, setStatusToken] = useState<string | null>(null);

  const maxPerEmail = event?.max_per_email ?? 5;

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
    const newIdx = persons.length;
    flushSync(() => {
      setPersons((prev) => [...prev, { firstName: "", lastName: "" }]);
    });
    firstNameRefs.current[newIdx]?.focus();
  };

  const removePerson = (idx: number) => {
    if (persons.length <= 1) return;
    setPersons((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePerson = (idx: number, field: keyof Person, value: string) => {
    setPersons((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
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

    const formEl = e.currentTarget as HTMLFormElement;
    const fd = new FormData(formEl);
    const _hp = (fd.get("_hp") as string | null) ?? "";
    const _ts = (fd.get("_ts") as string | null) ?? "";

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          email: email.trim(),
          phone: phone.trim(),
          persons: persons.map((p) => ({
            firstName: p.firstName.trim(),
            lastName: p.lastName.trim(),
          })),
          _hp,
          _ts,
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

  const isFull = event.current_participants >= event.max_participants;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isFull ? "Auf der Warteliste!" : "Anmeldung eingegangen!"}
            </h3>
            <p className="text-gray-600 mb-1">
              {isFull
                ? "Deine Anmeldung für die Warteliste wird nun geprüft:"
                : "Deine Anmeldung wird nun geprüft:"}
            </p>
            <p className="font-semibold text-gray-900 mb-2">{event.title}</p>
            <div className="text-sm text-gray-500 space-y-1 mb-2">
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
            </div>
            {persons.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3 mb-3 text-left">
                <p className="text-xs font-semibold text-green-700 mb-1">
                  {persons.length} {persons.length === 1 ? "Person" : "Personen"}{" "}
                  {isFull ? "auf der Warteliste" : "angemeldet"}:
                </p>
                {persons.map((p, i) => (
                  <p key={i} className="text-sm text-green-900">
                    {p.firstName} {p.lastName}
                  </p>
                ))}
              </div>
            )}
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
              {isFull
                ? "Du stehst auf der Warteliste. Wir melden uns per E-Mail, sobald ein Platz frei wird oder deine Anmeldung bestätigt wurde."
                : "Du erhältst eine E-Mail, sobald deine Anmeldung bestätigt wurde."}
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
              <DialogTitle>
                {isFull ? "Warteliste" : "Anmeldung"}: {event.title}
              </DialogTitle>
              <DialogDescription>
                {isFull
                  ? "Dieses Event ist ausgebucht. Trage dich in die Warteliste ein – wir benachrichtigen dich, sobald ein Platz frei wird."
                  : "Fülle das Formular aus, um dich für dieses Event anzumelden."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isFull && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
                  Das Event ist aktuell ausgebucht. Mit dieser Anmeldung setzen
                  wir dich auf die Warteliste und melden uns, sobald ein Platz
                  frei wird.
                </div>
              )}
              {/* Contact */}
              <div className="space-y-3">
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
              </div>

              {/* Persons */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <Label className="text-sm font-semibold">
                      Personen
                    </Label>
                    <span className="text-xs text-gray-400">
                      (max. {maxPerEmail} pro E-Mail)
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {persons.length} / {maxPerEmail}
                  </span>
                </div>

                <div className="space-y-3">
                  {persons.map((person, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-2"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          Person {idx + 1}
                          {idx === 0 && (
                            <span className="ml-1 text-gray-400">(du)</span>
                          )}
                        </span>
                        {persons.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePerson(idx)}
                            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Person entfernen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            ref={(el) => { firstNameRefs.current[idx] = el; }}
                            required
                            value={person.firstName}
                            maxLength={50}
                            onChange={(e) => updatePerson(idx, "firstName", e.target.value)}
                            placeholder="Vorname"
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <LastNameInput
                            required
                            value={person.lastName}
                            maxLength={50}
                            onChange={(v) => updatePerson(idx, "lastName", v)}
                            siblings={persons.filter((_, i) => i !== idx).map((p) => p.lastName)}
                            className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {persons.length < maxPerEmail && (
                  <button
                    type="button"
                    onClick={addPerson}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Person hinzufügen
                  </button>
                )}
              </div>

              {/* Consent */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="accepted"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <Label htmlFor="accepted" className="text-sm text-gray-600 cursor-pointer">
                  Ich akzeptiere die{" "}
                  <Link
                    href="/teilnahmebedingungen"
                    target="_blank"
                    className="underline hover:text-gray-900"
                  >
                    Teilnahmebedingungen
                  </Link>{" "}
                  und bin damit einverstanden, dass meine Daten zur
                  Organisation des Events verwendet werden. *
                </Label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <HoneypotFields />

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
                ) : isFull ? (
                  "In die Warteliste einschreiben"
                ) : (
                  `${persons.length} ${persons.length === 1 ? "Person" : "Personen"} anmelden`
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-2">
                Mit der Anmeldung akzeptierst du unsere{" "}
                <Link href="/teilnahmebedingungen" className="underline hover:text-foreground">
                  Teilnahmebedingungen
                </Link>
                .
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
