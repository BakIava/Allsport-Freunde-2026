"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { AlertTriangle, X, Trash2, RefreshCw, Plus, ShieldAlert } from "lucide-react";
import type { PersonIncident } from "@/lib/types";
import { incidentStyle } from "@/lib/incident-marker";

interface Props {
  /** Person whose incidents are managed. `null` = modal closed. */
  person: { firstName: string; lastName: string } | null;
  onClose: () => void;
  /** Called after an incident was added or deleted, so callers can refresh. */
  onChanged?: () => void;
}

function formatDate(d: string | null, fallback: string) {
  const value = d ?? fallback;
  return new Date(value.length === 10 ? value + "T00:00:00" : value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function IncidentModal({ person, onClose, onChanged }: Props) {
  const [incidents, setIncidents] = useState<PersonIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!person) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        first_name: person.firstName,
        last_name: person.lastName,
      });
      const res = await fetch(`/api/admin/incidents?${params}`);
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Fehler beim Laden.");
      else setIncidents(body.incidents ?? []);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }, [person]);

  useEffect(() => {
    if (person) {
      setDescription("");
      setDate("");
      load();
    }
  }, [person, load]);

  useEffect(() => {
    if (!person) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [person, onClose]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!person) return;
    if (!description.trim()) {
      setError("Bitte beschreibe das Ereignis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: person.firstName,
          last_name: person.lastName,
          description: description.trim(),
          incident_date: date || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Fehler beim Speichern.");
      else {
        setDescription("");
        setDate("");
        await load();
        onChanged?.();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/incidents/${id}`, { method: "DELETE" });
      if (res.ok) {
        await load();
        onChanged?.();
      }
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  }

  if (!person) return null;

  const style = incidentStyle(incidents.length);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 truncate">
                Vorfälle · {person.firstName} {person.lastName}
              </h2>
              <p className="text-xs text-gray-400">
                {incidents.length === 0
                  ? "Keine Vorfälle erfasst"
                  : `${incidents.length} ${incidents.length === 1 ? "Vorfall" : "Vorfälle"} erfasst`}
                {style && (
                  <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${style.badge}`}>
                    {style.label}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Incident list */}
        <div className="px-5 py-3 space-y-2 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
            </div>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              Noch keine Vorfälle für diese Person notiert.
            </p>
          ) : (
            incidents.map((inc) => (
              <div
                key={inc.id}
                className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {inc.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(inc.incident_date, inc.created_at)}
                      {inc.created_by ? ` · ${inc.created_by}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(inc.id)}
                    disabled={deletingId === inc.id}
                    title="Vorfall löschen"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {deletingId === inc.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="px-5 py-4 border-t border-gray-100 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Neues Ereignis notieren
          </div>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setError(null); }}
            rows={2}
            maxLength={1000}
            placeholder="z.B. Respektloses Verhalten gegenüber der Aufsicht…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">Datum</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={saving || !description.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ereignis speichern
          </button>
        </form>
      </div>
    </div>
  );
}
