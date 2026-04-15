"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Euro,
  Heart,
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  ReceiptText,
  Gift,
  RefreshCw,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { EventFinancials, EventWithRegistrations } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isPast(dateIso: string) {
  return dateIso < new Date().toISOString().split("T")[0];
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ event }: { event: EventWithRegistrations }) {
  if (event.status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
        <XCircle className="w-3.5 h-3.5" />
        Abgesagt
      </span>
    );
  }
  if (isPast(event.date)) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Abgeschlossen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
      <Clock className="w-3.5 h-3.5" />
      Geplant
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "gray" | "blue" | "rose" | "green" | "red";
  icon: React.ReactNode;
}) {
  const styles: Record<
    typeof color,
    { card: string; text: string; sub: string }
  > = {
    gray: {
      card: "bg-gray-50 border-gray-200",
      text: "text-gray-900",
      sub: "text-gray-500",
    },
    blue: {
      card: "bg-blue-50 border-blue-100",
      text: "text-blue-900",
      sub: "text-blue-600",
    },
    rose: {
      card: "bg-rose-50 border-rose-100",
      text: "text-rose-900",
      sub: "text-rose-600",
    },
    green: {
      card: "bg-green-50 border-green-200",
      text: "text-green-800",
      sub: "text-green-600",
    },
    red: {
      card: "bg-red-50 border-red-200",
      text: "text-red-800",
      sub: "text-red-600",
    },
  };

  return (
    <div className={`rounded-xl border p-5 space-y-2 ${styles[color].card}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold ${styles[color].text}`}>{value}</p>
      {sub && <p className={`text-xs ${styles[color].sub}`}>{sub}</p>}
    </div>
  );
}

/** Simple horizontal proportional bar */
function ProportionBar({
  revenue,
  costs,
}: {
  revenue: number;
  costs: number;
}) {
  const max = Math.max(revenue, costs, 0.01);
  const revPct = Math.min((revenue / max) * 100, 100);
  const costPct = Math.min((costs / max) * 100, 100);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <span className="w-28 text-sm text-gray-600 text-right shrink-0">Einnahmen</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${revPct}%` }}
          />
        </div>
        <span className="w-28 text-sm font-semibold text-green-700 tabular-nums shrink-0">
          {formatEuro(revenue)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-28 text-sm text-gray-600 text-right shrink-0">Kosten</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3.5 overflow-hidden">
          <div
            className="h-full bg-red-400 rounded-full transition-all duration-500"
            style={{ width: `${costPct}%` }}
          />
        </div>
        <span className="w-28 text-sm font-semibold text-red-600 tabular-nums shrink-0">
          {formatEuro(costs)}
        </span>
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function FinanzDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<EventWithRegistrations | null>(null);
  const [financials, setFinancials] = useState<EventFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [evRes, finRes] = await Promise.all([
        fetch(`/api/admin/events/${eventId}`),
        fetch(`/api/admin/events/${eventId}/finances`),
      ]);

      if (!evRes.ok) throw new Error("Event nicht gefunden.");
      if (!finRes.ok) throw new Error("Finanzdaten konnten nicht geladen werden.");

      const [evData, finData] = await Promise.all([evRes.json(), finRes.json()]);
      setEvent(evData);
      setFinancials(finData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !event || !financials) {
    return (
      <div className="p-6 space-y-4">
        <Link
          href="/admin/finanzen"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Finanzübersicht
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-center">
          {error ?? "Daten konnten nicht geladen werden."}
        </div>
      </div>
    );
  }

  const hasEntryPrice =
    financials.entry_price != null && financials.entry_price > 0;
  const totalRevenue = financials.actual_revenue + financials.total_donations;
  const balance = financials.balance;
  const balanceColor =
    balance > 0 ? "green" : balance < 0 ? "red" : "gray";

  const checkedInTotal =
    financials.checkedin_persons + financials.checkedin_guests;
  const approvedTotal =
    financials.approved_persons + financials.approved_guests;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/finanzen"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Finanzübersicht
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>{formatDate(event.date)}</span>
            <span className="text-gray-300">·</span>
            <span>{event.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge event={event} />
          <Link
            href={`/admin/events/${event.id}/dashboard`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Gesamt-Einnahmen"
          value={formatEuro(totalRevenue)}
          sub={
            hasEntryPrice
              ? `Eintritt ${formatEuro(financials.actual_revenue)} + Spenden ${formatEuro(financials.total_donations)}`
              : financials.total_donations > 0
              ? `Nur Spenden`
              : "Kein Eintrittspreis"
          }
          color="blue"
          icon={<Euro className="w-4 h-4 text-blue-500" />}
        />
        <SummaryCard
          label="Gesamt-Kosten"
          value={formatEuro(financials.total_costs)}
          sub={
            financials.costs.length > 0
              ? `${financials.costs.length} Position${financials.costs.length !== 1 ? "en" : ""}`
              : "Keine Kosten eingetragen"
          }
          color="gray"
          icon={<Wallet className="w-4 h-4 text-gray-500" />}
        />
        <SummaryCard
          label="Ergebnis"
          value={`${balance > 0 ? "+" : ""}${formatEuro(balance)}`}
          sub={
            balance > 0
              ? "Überschuss"
              : balance < 0
              ? "Defizit"
              : "Ausgeglichen"
          }
          color={balanceColor}
          icon={
            balance > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : balance < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-600" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )
          }
        />
      </div>

      {/* ── Main body: Revenue + Costs side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Einnahmen ── */}
        <div className="space-y-4">
          {/* Eintrittseinnahmen */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-blue-50/60">
              <Euro className="w-4 h-4 text-blue-500" />
              <h2 className="font-semibold text-gray-800 text-sm">
                Eintrittseinnahmen
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {!hasEntryPrice ? (
                <p className="text-sm text-gray-400 italic">
                  Kein Eintrittspreis hinterlegt.
                </p>
              ) : (
                <>
                  {/* Checked-in persons */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>
                        {checkedInTotal}{" "}
                        {checkedInTotal === 1 ? "Person" : "Personen"} eingecheckt
                      </span>
                      <span className="text-gray-400">
                        × {formatEuro(financials.entry_price!)}
                      </span>
                    </div>
                    {financials.checkedin_guests > 0 && (
                      <div className="text-xs text-gray-400 pl-3">
                        davon {financials.checkedin_guests}{" "}
                        {financials.checkedin_guests === 1
                          ? "Begleitperson"
                          : "Begleitpersonen"}
                      </div>
                    )}
                    {/* No-show context */}
                    {approvedTotal > checkedInTotal && (
                      <div className="text-xs text-amber-600 flex items-center gap-1 pt-0.5">
                        <span>
                          {approvedTotal - checkedInTotal} von {approvedTotal} angemeldeten{" "}
                          {approvedTotal === 1 ? "Person" : "Personen"} nicht erschienen
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-100 pt-3 font-semibold text-gray-900">
                    <span className="text-sm">Summe Eintritt</span>
                    <span className="tabular-nums">
                      {formatEuro(financials.actual_revenue)}
                    </span>
                  </div>

                  {/* Expected vs actual */}
                  {financials.expected_revenue !== financials.actual_revenue && (
                    <div className="text-xs text-gray-400 flex justify-between border border-dashed border-gray-200 rounded-lg px-3 py-2">
                      <span>Erwarteter Eintritt ({approvedTotal} Pers.)</span>
                      <span className="tabular-nums">
                        {formatEuro(financials.expected_revenue)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Spenden */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-rose-50/60">
              <Heart className="w-4 h-4 text-rose-500" />
              <h2 className="font-semibold text-gray-800 text-sm">Spenden</h2>
              {financials.donation_count > 0 && (
                <span className="ml-auto text-xs text-rose-500 font-medium">
                  {financials.donation_count}{" "}
                  {financials.donation_count === 1 ? "Spende" : "Spenden"}
                </span>
              )}
            </div>
            <div className="p-5">
              {financials.donation_count === 0 ? (
                <p className="text-sm text-gray-400 italic">Keine Spenden erfasst.</p>
              ) : (
                <div className="space-y-1">
                  {financials.donations.map((d, i) => (
                    <div
                      key={d.id}
                      className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 text-sm"
                    >
                      <span className="text-gray-600">
                        Spende {i + 1}
                        {d.note && (
                          <span className="ml-2 text-xs text-gray-400 italic">
                            {d.note}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums font-medium text-rose-600">
                        {formatEuro(d.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 font-semibold text-gray-900 border-t border-gray-100 mt-1">
                    <span className="text-sm">Summe Spenden</span>
                    <span className="tabular-nums text-rose-600">
                      {formatEuro(financials.total_donations)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total revenue summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex justify-between items-center">
            <span className="font-semibold text-blue-900 text-sm">
              Gesamt-Einnahmen
            </span>
            <span className="text-xl font-bold text-blue-900 tabular-nums">
              {formatEuro(totalRevenue)}
            </span>
          </div>
        </div>

        {/* ── RIGHT: Kosten ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/80">
              <ReceiptText className="w-4 h-4 text-gray-500" />
              <h2 className="font-semibold text-gray-800 text-sm">
                Kostenpositionen
              </h2>
              {financials.costs.length > 0 && (
                <span className="ml-auto text-xs text-gray-500 font-medium">
                  {financials.costs.length}{" "}
                  {financials.costs.length === 1 ? "Position" : "Positionen"}
                </span>
              )}
            </div>
            <div className="p-5">
              {financials.costs.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Keine Kostenpositionen eingetragen.
                </p>
              ) : (
                <div className="space-y-1">
                  {financials.costs.map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 text-sm"
                    >
                      <span className="text-gray-700">{c.description}</span>
                      <span className="tabular-nums font-medium text-gray-800">
                        {formatEuro(c.amount)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 font-semibold text-gray-900 border-t border-gray-100 mt-1">
                    <span className="text-sm">Summe Kosten</span>
                    <span className="tabular-nums">{formatEuro(financials.total_costs)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Placeholder hint when no data at all */}
          {financials.costs.length === 0 && (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-4">
              <p className="text-xs text-gray-400 text-center">
                Kostenpositionen können im{" "}
                <Link
                  href={`/admin/events/${event.id}/dashboard`}
                  className="underline hover:text-gray-600"
                >
                  Check-In Dashboard
                </Link>{" "}
                eingetragen werden.
              </p>
            </div>
          )}

          {/* Total costs summary */}
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-5 py-4 flex justify-between items-center">
            <span className="font-semibold text-gray-800 text-sm">
              Gesamt-Kosten
            </span>
            <span className="text-xl font-bold text-gray-900 tabular-nums">
              {formatEuro(financials.total_costs)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Result section ── */}
      <div
        className={`rounded-2xl border-2 p-6 space-y-5 ${
          balance > 0
            ? "bg-green-50 border-green-200"
            : balance < 0
            ? "bg-red-50 border-red-200"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        {/* Result label + value */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {balance > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : balance < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-600" />
            ) : (
              <Minus className="w-5 h-5 text-gray-400" />
            )}
            <h2
              className={`text-lg font-bold ${
                balance > 0
                  ? "text-green-800"
                  : balance < 0
                  ? "text-red-800"
                  : "text-gray-700"
              }`}
            >
              Ergebnis
            </h2>
          </div>
          <span
            className={`text-3xl font-bold tabular-nums ${
              balance > 0
                ? "text-green-700"
                : balance < 0
                ? "text-red-700"
                : "text-gray-600"
            }`}
          >
            {balance > 0 ? "+" : ""}
            {formatEuro(balance)}
          </span>
        </div>

        {/* Visual bar chart */}
        <ProportionBar revenue={totalRevenue} costs={financials.total_costs} />

        {/* Calculation breakdown */}
        <div
          className={`rounded-xl px-4 py-3 text-sm space-y-1 font-mono ${
            balance > 0
              ? "bg-green-100/60 text-green-900"
              : balance < 0
              ? "bg-red-100/60 text-red-900"
              : "bg-gray-100/60 text-gray-800"
          }`}
        >
          <div className="flex justify-between">
            <span>Einnahmen (Eintritt + Spenden)</span>
            <span className="tabular-nums">+ {formatEuro(totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kosten</span>
            <span className="tabular-nums">− {formatEuro(financials.total_costs)}</span>
          </div>
          <div
            className={`flex justify-between font-bold border-t pt-1 mt-1 ${
              balance > 0
                ? "border-green-300"
                : balance < 0
                ? "border-red-300"
                : "border-gray-300"
            }`}
          >
            <span>Ergebnis</span>
            <span className="tabular-nums">
              {balance > 0 ? "+" : ""}
              {formatEuro(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Donated-items note */}
      {financials.donation_count > 0 && (
        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1.5">
          <Gift className="w-3.5 h-3.5" />
          Spenden sind aus Datenschutzgründen ohne Spendernamen dargestellt.
        </p>
      )}
    </div>
  );
}
