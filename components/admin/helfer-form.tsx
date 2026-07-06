"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Helper, HelperQualification } from "@/lib/types";
import { HELPER_QUALIFICATION_LABELS } from "@/lib/types";

const QUALIFICATIONS: HelperQualification[] = [
  "TRAINER",
  "AUFSICHT",
  "RETTUNGSSCHWIMMER",
];

interface HelferFormProps {
  initial?: Helper;
}

export default function HelferForm({ initial }: HelferFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [qualifications, setQualifications] = useState<HelperQualification[]>(
    initial?.qualifications ?? []
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleQual(q: HelperQualification) {
    setQualifications((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }
    if (qualifications.length === 0) {
      setError("Mindestens eine Qualifikation muss ausgewählt werden.");
      return;
    }

    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/helfer/${initial!.id}`
        : "/api/admin/helfer";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          qualifications,
          notes: notes.trim() || null,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unbekannter Fehler");
      }

      const saved: Helper = await res.json();
      router.push(`/admin/helfer/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vor- und Nachname"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* E-Mail */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="max@beispiel.de"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Telefon */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Telefon
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+49 123 456789"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
        />
      </div>

      {/* Qualifikationen */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Qualifikationen <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-3">
          {QUALIFICATIONS.map((q) => (
            <label
              key={q}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={qualifications.includes(q)}
                onChange={() => toggleQual(q)}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                {HELPER_QUALIFICATION_LABELS[q]}
              </span>
            </label>
          ))}
        </div>
        {qualifications.length === 0 && (
          <p className="text-xs text-gray-400">
            Mindestens eine Qualifikation auswählen.
          </p>
        )}
      </div>

      {/* Notizen */}
      <div className="space-y-1.5">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notizen
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Interne Hinweise zum Helfer…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
        />
      </div>

      {/* Aktiv-Status (nur im Edit-Modus) */}
      {isEdit && (
        <div className="flex items-center gap-3">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
            Helfer ist aktiv
          </label>
        </div>
      )}

      {/* Aktionen */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Änderungen speichern" : "Helfer anlegen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={saving}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
