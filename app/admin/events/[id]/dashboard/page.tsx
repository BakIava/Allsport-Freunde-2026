"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  UserPlus,
  X,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import RegistrationDetailButton from "@/components/RegistrationDetailButton";
import type { CheckinParticipant, CheckinStatusResponse } from "@/lib/types";

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

interface WalkInForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
  guests: number;
}

const EMPTY_FORM: WalkInForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  notes: "",
  guests: 0,
};

export default function CheckinDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [data, setData] = useState<CheckinStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manualCheckinId, setManualCheckinId] = useState<number | null>(null);
  const [undoId, setUndoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Walk-in modal state
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInForm, setWalkInForm] = useState<WalkInForm>(EMPTY_FORM);
  const [walkInLoading, setWalkInLoading] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  // Walk-in QR modal state
  interface QRData { qrCodeDataUrl: string; walkInUrl: string; eventTitle: string }
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  // Focus first field when modal opens
  useEffect(() => {
    if (showWalkIn) {
      setTimeout(() => firstNameRef.current?.focus(), 50);
    }
  }, [showWalkIn]);

  // Close modal on Escape key
  useEffect(() => {
    if (!showWalkIn) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWalkIn();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showWalkIn]);

  function openWalkIn() {
    setWalkInForm(EMPTY_FORM);
    setWalkInError(null);
    setShowWalkIn(true);
  }

  function closeWalkIn() {
    if (walkInLoading) return;
    setShowWalkIn(false);
    setWalkInError(null);
  }

  async function handleShowQR() {
    setQrError(null);
    setShowQR(true);
    if (qrData) return; // already loaded
    setQrLoading(true);
    try {
      const res = await fetch(
        `/api/admin/checkin/walkin-qr?eventId=${eventId}`
      );
      const body = await res.json();
      if (!res.ok) {
        setQrError(body.error ?? "Fehler beim Laden des QR-Codes.");
      } else {
        setQrData(body);
      }
    } catch {
      setQrError("Netzwerkfehler.");
    } finally {
      setQrLoading(false);
    }
  }

  function handleCopyLink() {
    if (!qrData) return;
    navigator.clipboard.writeText(qrData.walkInUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleWalkInSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWalkInError(null);
    setWalkInLoading(true);
    try {
      const res = await fetch("/api/checkin/walkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: Number(eventId),
          first_name: walkInForm.first_name,
          last_name: walkInForm.last_name,
          email: walkInForm.email || undefined,
          phone: walkInForm.phone || undefined,
          notes: walkInForm.notes || undefined,
          guests: walkInForm.guests,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setWalkInError(body.error ?? "Fehler beim Hinzufügen.");
      } else {
        setShowWalkIn(false);
        await fetchStatus();
      }
    } catch {
      setWalkInError("Netzwerkfehler.");
    } finally {
      setWalkInLoading(false);
    }
  }

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
      ["Name", "E-Mail", "Telefon", "Begleiter", "Status", "Eingecheckt um", "Walk-in", "Bemerkung"],
      ...data.participants.map((p) => [
        `${p.first_name} ${p.last_name}`,
        p.email ?? "",
        p.phone ?? "",
        String(p.guests),
        p.checked_in_at ? "Eingecheckt" : "Ausstehend",
        formatTime(p.checked_in_at) ?? "",
        p.is_walk_in ? "Ja" : "Nein",
        p.notes ?? "",
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
      (p.email?.toLowerCase().includes(q) ?? false)
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
            onClick={handleShowQR}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Walk-in QR
          </button>
          <button
            onClick={openWalkIn}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Teilnehmer hinzufügen
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
                <p className="text-sm text-gray-500">Personen gesamt</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700">
                  {data.checked_in} <span className="text-base font-medium text-gray-400">/ {data.total}</span>
                </p>
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
              {data.checked_in} von {data.total} Personen eingecheckt
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {data.total_registrations} Anmeldungen · {data.total_guests} Begleitpersonen
            </p>
            <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
              🚶 {data.walk_in_registrations} Walk-ins{data.walk_in_guests > 0 ? ` (+ ${data.walk_in_guests} Begleitpersonen)` : ""}
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

      {/* Walk-in Modal */}
      {showWalkIn && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) closeWalkIn(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Walk-in hinzufügen</h2>
              </div>
              <button
                onClick={closeWalkIn}
                disabled={walkInLoading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleWalkInSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Vorname <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={firstNameRef}
                    type="text"
                    required
                    value={walkInForm.first_name}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nachname <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInForm.last_name}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  E-Mail <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={walkInForm.email}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="max@beispiel.de"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Telefonnummer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={walkInForm.phone}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0151 12345678"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Bemerkung <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={walkInForm.notes}
                  onChange={(e) => setWalkInForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="z.B. Kam mit Mitglied XY, Schnuppertraining…"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Begleitpersonen
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWalkInForm((f) => ({ ...f, guests: Math.max(0, f.guests - 1) }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-lg font-medium transition-colors"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold text-gray-900 w-6 text-center tabular-nums">
                    {walkInForm.guests}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWalkInForm((f) => ({ ...f, guests: Math.min(10, f.guests + 1) }))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-lg font-medium transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {walkInError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{walkInError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeWalkIn}
                  disabled={walkInLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={walkInLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {walkInLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Einchecken
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Walk-in QR-Code Modal */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setShowQR(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-violet-600" />
                <h2 className="text-base font-semibold text-gray-900">Walk-in QR-Code</h2>
              </div>
              <button
                onClick={() => setShowQR(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR code area */}
            <div className="px-5 py-5 flex flex-col items-center gap-4">
              {qrLoading && (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
                </div>
              )}
              {qrError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 w-full text-center">
                  {qrError}
                </p>
              )}
              {qrData && !qrLoading && (
                <>
                  {/* QR code image */}
                  <div className="bg-white p-2 rounded-xl border-2 border-gray-100 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData.qrCodeDataUrl}
                      alt="Walk-in QR-Code"
                      className="w-64 h-64"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{qrData.eventTitle}</p>
                    <p className="text-xs text-gray-500">
                      Gäste scannen diesen Code um sich vor Ort anzumelden
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm text-gray-600 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="text-green-700">Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Link kopieren
                        </>
                      )}
                    </button>
                    <a
                      href={qrData.walkInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm text-gray-600 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Öffnen
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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

  const subtitle = participant.email ?? participant.phone ?? "–";

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
          <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-1.5">
            {participant.first_name} {participant.last_name}
            {participant.guests > 0 && (
              <span className="text-xs text-gray-400">+{participant.guests}</span>
            )}
            {participant.is_walk_in && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 leading-none">
                Walk-in
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          {participant.notes && (
            <p className="text-xs text-gray-400 truncate italic">{participant.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <RegistrationDetailButton registrationId={participant.id} />
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
