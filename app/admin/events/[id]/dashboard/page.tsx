"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Users,
  Search,
  QrCode,
  Download,
  RefreshCw,
  UserCheck,
  Undo2,
} from "lucide-react";
import type { CheckinParticipant, CheckinStatusResponse } from "@/lib/types";

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export default function CheckinDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<CheckinStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manualCheckinId, setManualCheckinId] = useState<number | null>(null);
  const [undoId, setUndoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkin/status/${eventId}`);
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Initial fetch + auto-refresh every 10 seconds
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  async function handleUndo(participantId: number) {
    setUndoId(participantId);
    setError(null);
    try {
      const res = await fetch("/api/checkin/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: participantId }),
      });
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Fehler beim Auschecken.");
      else await fetchStatus();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setUndoId(null);
    }
  }

  async function handleManualCheckin(participantId: number) {
    setManualCheckinId(participantId);
    setError(null);
    try {
      const res = await fetch("/api/checkin/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: participantId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Fehler beim Check-In.");
      } else {
        await fetchStatus();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setManualCheckinId(null);
    }
  }

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Name", "E-Mail", "Begleiter", "Status", "Eingecheckt um"],
      ...data.participants.map((p) => [
        `${p.first_name} ${p.last_name}`,
        p.email,
        String(p.guests),
        p.checked_in_at ? "Eingecheckt" : "Ausstehend",
        formatTime(p.checked_in_at) ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `checkin-event-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = (data?.participants ?? []).filter((p: CheckinParticipant) => {
    const q = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  const checkedInFiltered = filtered.filter((p) => p.checked_in_at !== null);
  const missingFiltered = filtered.filter((p) => p.checked_in_at === null);

  const progressPct = data && data.total > 0 ? Math.round((data.checked_in / data.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-In Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Event #{eventId} · Live-Übersicht</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => router.push(`/admin/events/${eventId}/scanner`)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Scanner öffnen
          </button>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Aktualisieren
          </button>
          <button
            onClick={exportCSV}
            disabled={!data}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : !data ? (
        <p className="text-center text-gray-500 py-20">Keine Daten verfügbar.</p>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{data.total}</p>
                <p className="text-sm text-gray-500">Gesamt</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">{data.checked_in}</p>
                <p className="text-sm text-gray-500">Eingecheckt</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{data.missing}</p>
                <p className="text-sm text-gray-500">Ausstehend</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
              <span>Fortschritt</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {data.checked_in} von {data.total} Teilnehmern eingecheckt
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Name oder E-Mail suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}

          {/* Participant list – checked in first, then missing */}
          <div className="space-y-2">
            {checkedInFiltered.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  Eingecheckt ({checkedInFiltered.length})
                </h3>
                {checkedInFiltered.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onManualCheckin={handleManualCheckin}
                    onUndo={handleUndo}
                    loadingId={manualCheckinId}
                    undoId={undoId}
                  />
                ))}
              </>
            )}
            {missingFiltered.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 pt-2">
                  Ausstehend ({missingFiltered.length})
                </h3>
                {missingFiltered.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    onManualCheckin={handleManualCheckin}
                    onUndo={handleUndo}
                    loadingId={manualCheckinId}
                    undoId={undoId}
                  />
                ))}
              </>
            )}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 py-10 text-sm">
                Keine Teilnehmer gefunden.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ParticipantRow({
  participant,
  onManualCheckin,
  onUndo,
  loadingId,
  undoId,
}: {
  participant: CheckinParticipant;
  onManualCheckin: (id: number) => void;
  onUndo: (id: number) => void;
  loadingId: number | null;
  undoId: number | null;
}) {
  const checked = participant.checked_in_at !== null;
  const loadingCheckin = loadingId === participant.id;
  const loadingUndo = undoId === participant.id;
  const busy = loadingCheckin || loadingUndo;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        checked
          ? "bg-green-50 border-green-100"
          : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
            checked ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {participant.first_name[0]}{participant.last_name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {participant.first_name} {participant.last_name}
            {participant.guests > 0 && (
              <span className="ml-1 text-xs text-gray-400">+{participant.guests}</span>
            )}
          </p>
          <p className="text-xs text-gray-400 truncate">{participant.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {checked ? (
          <>
            <span className="flex items-center gap-1 text-xs font-medium text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {formatTime(participant.checked_in_at)}
            </span>
            <button
              onClick={() => onUndo(participant.id)}
              disabled={busy}
              title="Check-In rückgängig machen"
              className="flex items-center gap-1 px-2 py-1.5 text-xs border border-gray-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingUndo ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Undo2 className="w-3.5 h-3.5" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => onManualCheckin(participant.id)}
            disabled={busy}
            title="Manuell einchecken"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-200 hover:border-green-300 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {loadingCheckin ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            Einchecken
          </button>
        )}
      </div>
    </div>
  );
}
