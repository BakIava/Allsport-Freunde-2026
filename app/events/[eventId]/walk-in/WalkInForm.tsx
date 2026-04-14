"use client";

import { useState, useRef, useEffect } from "react";
import {
  MapPin,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Users,
} from "lucide-react";

interface WalkInFormProps {
  eventId: number;
  token: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
}

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  guests: number;
  privacy_accepted: boolean;
  terms_accepted: boolean;
}

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  notes: "",
  guests: 0,
  privacy_accepted: false,
  terms_accepted: false,
};

export function WalkInForm({
  eventId,
  token,
  eventTitle,
  eventDate,
  eventLocation,
}: WalkInFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const firstNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstNameRef.current?.focus();
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          token,
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          notes: form.notes || undefined,
          guests: form.guests,
          privacy_accepted: form.privacy_accepted,
          terms_accepted: form.terms_accepted,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Fehler bei der Registrierung.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Erfolgreich registriert!
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Du bist jetzt für <strong>{eventTitle}</strong> eingetragen.
            Bitte melde dich beim Organisator vor Ort.
          </p>
          {form.guests > 0 && (
            <p className="text-sm text-gray-500">
              Eingetragen mit{" "}
              {form.guests === 1
                ? "1 Begleitperson"
                : `${form.guests} Begleitpersonen`}
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Event info card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{eventTitle}</h1>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>{eventDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{eventLocation}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 pt-1 border-t border-gray-50">
            Vor-Ort-Anmeldung · Trage dich jetzt ein
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Vorname <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstNameRef}
                type="text"
                required
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => set("first_name", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="Max"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nachname <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={form.last_name}
                onChange={(e) => set("last_name", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                placeholder="Mustermann"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-Mail{" "}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              placeholder="max@beispiel.de"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telefonnummer{" "}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              placeholder="0151 12345678"
            />
          </div>

          {/* Guests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Begleitpersonen
              </span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Wie viele Personen bringst du zusätzlich mit?
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => set("guests", Math.max(0, form.guests - 1))}
                className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xl font-medium transition-colors"
              >
                −
              </button>
              <span className="text-xl font-semibold text-gray-900 w-8 text-center tabular-nums">
                {form.guests}
              </span>
              <button
                type="button"
                onClick={() => set("guests", Math.min(10, form.guests + 1))}
                className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xl font-medium transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bemerkung{" "}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500 bg-white resize-none"
              placeholder="z.B. Probetraining, komme mit Mitglied XY…"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.privacy_accepted}
                onChange={(e) => set("privacy_accepted", e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug">
                Ich habe die{" "}
                <a href="/datenschutz" className="underline hover:text-gray-900">
                  Datenschutzerklärung
                </a>{" "}
                gelesen und stimme der Verarbeitung meiner Daten zu.{" "}
                <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.terms_accepted}
                onChange={(e) => set("terms_accepted", e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug">
                Ich akzeptiere die{" "}
                <a href="/teilnahmebedingungen" className="underline hover:text-gray-900">
                  Teilnahmebedingungen
                </a>
                .{" "}
                <span className="text-red-500">*</span>
              </span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-base rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Wird registriert…
              </>
            ) : (
              "Jetzt eintragen"
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Mit dem Absenden wirst du direkt als Vor-Ort-Teilnehmer eingetragen.
          </p>
        </form>
      </div>
    </div>
  );
}
