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
  Heart,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import RegistrationDetailButton from "@/components/RegistrationDetailButton";
import type { CheckinParticipant, CheckinStatusResponse, EventFinancials, EventDonation } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

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

interface DonationForm {
  registration_id: number | null;
  donor_name: string;
  amount: string;
  note: string;
}

const EMPTY_DONATION: DonationForm = {
  registration_id: null,
  donor_name: "",
  amount: "",
  note: "",
};

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
  const [financials, setFinancials] = useState<EventFinancials | null>(null);

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

  // Donation modal state
  const [showDonation, setShowDonation] = useState(false);
  const [donationForm, setDonationForm] = useState<DonationForm>(EMPTY_DONATION);
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [deletingDonationId, setDeletingDonationId] = useState<number | null>(null);
  const donorNameRef = useRef<HTMLInputElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [statusRes, finRes] = await Promise.allSettled([
        fetch(`/api/checkin/status/${eventId}`),
        fetch(`/api/admin/events/${eventId}/finances`),
      ]);
      if (statusRes.status === "fulfilled" && statusRes.value.ok) {
        setData(await statusRes.value.json());
      }
      if (finRes.status === "fulfilled" && finRes.value.ok) {
        setFinancials(await finRes.value.json());
      } else if (finRes.status === "fulfilled" && !finRes.value.ok) {
        // API reachable but returned error – show empty financials so section appears
        setFinancials({
          entry_price: null,
          total_costs: 0,
          approved_persons: 0,
          approved_guests: 0,
          expected_revenue: 0,
          checkedin_persons: 0,
          checkedin_guests: 0,
          actual_revenue: 0,
          total_donations: 0,
          donation_count: 0,
          balance: 0,
          costs: [],
          donations: [],
        });
      }
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

  // Focus first field when walk-in modal opens
  useEffect(() => {
    if (showWalkIn) {
      setTimeout(() => firstNameRef.current?.focus(), 50);
    }
  }, [showWalkIn]);

  // Focus donor name when donation modal opens
  useEffect(() => {
    if (showDonation) {
      setTimeout(() => donorNameRef.current?.focus(), 50);
    }
  }, [showDonation]);

  // Close modals on Escape key
  useEffect(() => {
    if (!showWalkIn) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWalkIn();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showWalkIn]);

  useEffect(() => {
    if (!showDonation) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDonation();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showDonation]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.relative')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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

  function openDonation() {
    setDonationForm(EMPTY_DONATION);
    setDonationError(null);
    setShowDonation(true);
  }

  function closeDonation() {
    if (donationLoading) return;
    setShowDonation(false);
    setDonationError(null);
  }

  async function handleDonationSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDonationError(null);
    const amount = parseFloat(donationForm.amount.replace(",", "."));
    if (!donationForm.donor_name.trim()) {
      setDonationError("Name des Spenders ist erforderlich.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setDonationError("Betrag muss größer als 0 sein.");
      return;
    }
    setDonationLoading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_id: donationForm.registration_id,
          donor_name: donationForm.donor_name.trim(),
          amount,
          note: donationForm.note.trim() || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setDonationError(body.error ?? "Fehler beim Speichern.");
      } else {
        // Stay open for quick multi-entry; reset form but keep modal open
        setDonationForm(EMPTY_DONATION);
        await fetchStatus();
        setTimeout(() => donorNameRef.current?.focus(), 50);
      }
    } catch {
      setDonationError("Netzwerkfehler.");
    } finally {
      setDonationLoading(false);
    }
  }

  async function handleDeleteDonation(donationId: number) {
    setDeletingDonationId(donationId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/donations/${donationId}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchStatus();
    } catch {
      // silent
    } finally {
      setDeletingDonationId(null);
    }
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
        <div className="flex items-center gap-3">
          {/* Primär: Großer Scanner Button */}
          <button
            onClick={() => router.push(`/admin/events/${eventId}/scanner`)}
            className="flex items-center gap-3 px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg text-base font-semibold transition-colors shadow-md"
          >
            <QrCode className="w-5 h-5" />
            Scanner öffnen
          </button>

          {/* Sekundär: Walk-in QR und Teilnehmer hinzufügen */}
          <div className="flex gap-2">
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
          </div>

          {/* Tertiär: Dropdown für Mehr */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
              Mehr
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => { setDropdownOpen(false); openDonation(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-700"
                >
                  <Heart className="w-4 h-4" />
                  Spende eintragen
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); fetchStatus(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 text-sm text-gray-700"
                >
                  <RefreshCw className="w-4 h-4" />
                  Aktualisieren
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); exportCSV(); }}
                  disabled={!data}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-700"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            )}
          </div>
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

          {/* ── Finanzen ── */}
          {financials && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">€</span>
                Finanzen
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Gesamtkosten */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-gray-500">Gesamtkosten</p>
                  <p className="text-base font-bold text-gray-900">{formatEuro(financials.total_costs)}</p>
                </div>

                {/* Erwarteter Umsatz */}
                {financials.entry_price != null && financials.entry_price > 0 ? (
                  <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-blue-700">Erw. Umsatz</p>
                    <p className="text-base font-bold text-blue-900">{formatEuro(financials.expected_revenue)}</p>
                    <p className="text-xs text-blue-600">
                      ({financials.approved_persons} Anm.{financials.approved_guests > 0 ? ` + ${financials.approved_guests} Bgl.` : ""}) × {formatEuro(financials.entry_price)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-gray-500">Erw. Umsatz</p>
                    <p className="text-sm text-gray-400 italic">Kein Preis</p>
                  </div>
                )}

                {/* Tatsächlicher Umsatz */}
                {financials.entry_price != null && financials.entry_price > 0 ? (
                  <div className="bg-green-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-green-700">Tats. Umsatz</p>
                    <p className="text-base font-bold text-green-900">{formatEuro(financials.actual_revenue)}</p>
                    <p className="text-xs text-green-600">
                      ({financials.checkedin_persons} eingecheckt{financials.checkedin_guests > 0 ? ` + ${financials.checkedin_guests} Bgl.` : ""}) × {formatEuro(financials.entry_price)}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-gray-500">Tats. Umsatz</p>
                    <p className="text-sm text-gray-400 italic">Kein Preis</p>
                  </div>
                )}

                {/* Spenden */}
                <div className="bg-rose-50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-rose-700 flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    Spenden
                  </p>
                  <p className="text-base font-bold text-rose-900">{formatEuro(financials.total_donations ?? 0)}</p>
                  <p className="text-xs text-rose-600">{financials.donation_count ?? 0} Spende{(financials.donation_count ?? 0) !== 1 ? "n" : ""}</p>
                </div>

                {/* Bilanz */}
                {(financials.entry_price != null && financials.entry_price > 0) || (financials.total_donations ?? 0) > 0 || financials.total_costs > 0 ? (
                  <div className={`rounded-lg p-3 space-y-1 ${financials.balance > 0 ? "bg-green-100" : financials.balance < 0 ? "bg-red-100" : "bg-gray-50"}`}>
                    <p className={`text-xs ${financials.balance > 0 ? "text-green-700" : financials.balance < 0 ? "text-red-700" : "text-gray-500"}`}>Bilanz</p>
                    <p className={`text-base font-bold ${financials.balance > 0 ? "text-green-800" : financials.balance < 0 ? "text-red-800" : "text-gray-700"}`}>
                      {financials.balance > 0 ? "+" : ""}{formatEuro(financials.balance)}
                    </p>
                    <p className={`text-xs ${financials.balance > 0 ? "text-green-600" : financials.balance < 0 ? "text-red-600" : "text-gray-400"}`}>
                      {financials.balance > 0 ? "Überschuss" : financials.balance < 0 ? "Defizit" : "Ausgeglichen"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-gray-500">Bilanz</p>
                    <p className="text-sm text-gray-400 italic">–</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Spenden-Liste ── */}
          {financials && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Spenden ({financials.donation_count ?? 0})
                </h2>
                <button
                  onClick={openDonation}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-medium transition-colors"
                >
                  <Heart className="w-3 h-3" />
                  Eintragen
                </button>
              </div>

              {(financials.donations ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 italic py-2">Noch keine Spenden erfasst.</p>
              ) : (
                <div className="space-y-2">
                  {(financials.donations ?? []).map((d: EventDonation) => (
                    <div key={d.id} className="flex items-start justify-between gap-3 rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{d.donor_name}</p>
                        {d.note && <p className="text-xs text-gray-500 truncate">{d.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(d.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-rose-700">{formatEuro(d.amount)}</span>
                        <button
                          onClick={() => handleDeleteDonation(d.id)}
                          disabled={deletingDonationId === d.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Spende löschen"
                        >
                          {deletingDonationId === d.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">
                      Gesamt: <span className="text-rose-700">{formatEuro(financials.total_donations ?? 0)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

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
                {search
                  ? "Keine Teilnehmer gefunden."
                  : "Noch keine Teilnehmer – Teilnehmer können manuell oder per Walk-in hinzugefügt werden."}
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

      {/* Donation Modal */}
      {showDonation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) closeDonation(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-500" />
                <h2 className="text-lg font-semibold text-gray-900">Spende eintragen</h2>
              </div>
              <button
                onClick={closeDonation}
                disabled={donationLoading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDonationSubmit} className="px-6 py-5 space-y-4">
              {/* Participant select or external donor */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Teilnehmer <span className="text-gray-400 font-normal">(optional – für registrierte Teilnehmer)</span>
                </label>
                <select
                  value={donationForm.registration_id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setDonationForm((f) => ({ ...f, registration_id: null, donor_name: "" }));
                    } else {
                      const participant = data?.participants.find((p) => p.id === Number(val));
                      setDonationForm((f) => ({
                        ...f,
                        registration_id: Number(val),
                        donor_name: participant ? `${participant.first_name} ${participant.last_name}` : f.donor_name,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                >
                  <option value="">— Externer Spender —</option>
                  {(data?.participants ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}{p.guests > 0 ? ` (+${p.guests})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Donor name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Name des Spenders <span className="text-red-500">*</span>
                </label>
                <input
                  ref={donorNameRef}
                  type="text"
                  required
                  maxLength={254}
                  value={donationForm.donor_name}
                  onChange={(e) => setDonationForm((f) => ({ ...f, donor_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="Max Mustermann"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Betrag (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={donationForm.amount}
                  max={999_999_999}
                  onChange={(e) => setDonationForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="10,00"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Kommentar <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={donationForm.note}
                  onChange={(e) => setDonationForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                  placeholder="z.B. Für die Jugendarbeit"
                />
              </div>

              {donationError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{donationError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeDonation}
                  disabled={donationLoading}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Schließen
                </button>
                <button
                  type="submit"
                  disabled={donationLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {donationLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  Spende speichern
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Nach dem Speichern bleibt das Formular offen für weitere Eingaben.
              </p>
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
              <span>Rückgängig</span>
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
