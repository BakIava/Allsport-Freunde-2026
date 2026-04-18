"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Euro,
  Heart,
  Wallet,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import type { EventWithRegistrations } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format number for CSV: German decimal separator, no currency symbol */
function toCsvDecimal(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// ─── types ───────────────────────────────────────────────────────────────────

type Period = "all" | "this-year" | "last-month" | "last-3-months" | "custom";
type StatusFilter = "all" | "past" | "upcoming";
type SortKey =
  | "title"
  | "date"
  | "total_costs"
  | "expected_revenue"
  | "actual_revenue"
  | "total_donations"
  | "balance";
type SortDir = "asc" | "desc";

interface FinanceRow extends EventWithRegistrations {
  balance: number;
}

// ─── filter helpers ──────────────────────────────────────────────────────────

function getPeriodRange(period: Period, customFrom: string, customTo: string): [string | null, string | null] {
  const now = new Date();
  if (period === "this-year") {
    const y = now.getFullYear();
    return [`${y}-01-01`, `${y}-12-31`];
  }
  if (period === "last-month") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return [first.toISOString().split("T")[0], last.toISOString().split("T")[0]];
  }
  if (period === "last-3-months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return [d.toISOString().split("T")[0], null];
  }
  if (period === "custom") {
    return [customFrom || null, customTo || null];
  }
  return [null, null];
}

function applyFilters(
  events: EventWithRegistrations[],
  period: Period,
  customFrom: string,
  customTo: string,
  statusFilter: StatusFilter
): FinanceRow[] {
  const today = getToday();
  const [from, to] = getPeriodRange(period, customFrom, customTo);

  return events
    .filter((e) => {
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      if (statusFilter === "past" && e.date >= today) return false;
      if (statusFilter === "upcoming" && e.date < today) return false;
      return true;
    })
    .map((e) => {
      const actual = e.actual_revenue ?? 0;
      const donations = e.total_donations ?? 0;
      const costs = e.total_costs ?? 0;
      return { ...e, balance: actual + donations - costs };
    });
}

function sortRows(rows: FinanceRow[], key: SortKey, dir: SortDir): FinanceRow[] {
  return [...rows].sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    if (key === "title") { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
    else if (key === "date") { va = a.date; vb = b.date; }
    else if (key === "total_costs") { va = a.total_costs ?? 0; vb = b.total_costs ?? 0; }
    else if (key === "expected_revenue") { va = a.expected_revenue ?? 0; vb = b.expected_revenue ?? 0; }
    else if (key === "actual_revenue") { va = a.actual_revenue ?? 0; vb = b.actual_revenue ?? 0; }
    else if (key === "total_donations") { va = a.total_donations ?? 0; vb = b.total_donations ?? 0; }
    else { va = a.balance; vb = b.balance; }

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "gray" | "blue" | "rose" | "green" | "red";
  icon: React.ReactNode;
}) {
  const bg: Record<typeof color, string> = {
    gray: "bg-gray-50 border-gray-100",
    blue: "bg-blue-50 border-blue-100",
    rose: "bg-rose-50 border-rose-100",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
  };
  const text: Record<typeof color, string> = {
    gray: "text-gray-900",
    blue: "text-blue-900",
    rose: "text-rose-900",
    green: "text-green-800",
    red: "text-red-800",
  };
  const sub_: Record<typeof color, string> = {
    gray: "text-gray-500",
    blue: "text-blue-600",
    rose: "text-rose-600",
    green: "text-green-600",
    red: "text-red-600",
  };

  return (
    <div className={`rounded-xl border p-5 space-y-2 ${bg[color]}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold ${text[color]}`}>{value}</p>
      <p className={`text-xs ${sub_[color]}`}>{sub}</p>
    </div>
  );
}

function SortTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-900 ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-green-600" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </span>
    </th>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function FinanzenPage() {
  const [allEvents, setAllEvents] = useState<EventWithRegistrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/finanzen");
      if (!res.ok) throw new Error("Fehler beim Laden.");
      setAllEvents(await res.json());
    } catch {
      setError("Finanzdaten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d: SortDir) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "title" ? "asc" : "desc");
    }
  }

  const filteredRows = useMemo(
    () => applyFilters(allEvents, period, customFrom, customTo, statusFilter),
    [allEvents, period, customFrom, customTo, statusFilter]
  );

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir]
  );

  const totals = useMemo(() => {
    const totalCosts = filteredRows.reduce((s: number, e: FinanceRow) => s + (e.total_costs ?? 0), 0);
    const totalExpected = filteredRows.reduce((s: number, e: FinanceRow) => s + (e.expected_revenue ?? 0), 0);
    const totalRevenue = filteredRows.reduce((s: number, e: FinanceRow) => s + (e.actual_revenue ?? 0), 0);
    const totalDonations = filteredRows.reduce((s: number, e: FinanceRow) => s + (e.total_donations ?? 0), 0);
    const balance = totalRevenue + totalDonations - totalCosts;
    return { totalCosts, totalExpected, totalRevenue, totalDonations, balance };
  }, [filteredRows]);

  function exportCSV() {
    const header = ["Event", "Datum", "Kosten", "Erw. Umsatz", "Tats. Umsatz", "Spenden", "Bilanz"];
    const dataRows = sortedRows.map((e) => {
      const hasPrice = e.entry_price != null && e.entry_price > 0;
      return [
        `"${e.title.replace(/"/g, '""')}"`,
        formatDate(e.date),
        toCsvDecimal(e.total_costs ?? 0),
        hasPrice ? toCsvDecimal(e.expected_revenue ?? 0) : "",
        hasPrice ? toCsvDecimal(e.actual_revenue ?? 0) : "",
        (e.total_donations ?? 0) > 0 ? toCsvDecimal(e.total_donations ?? 0) : "",
        toCsvDecimal(e.balance),
      ].join(";");
    });
    const sumRow = [
      '"Gesamt"',
      "",
      toCsvDecimal(totals.totalCosts),
      toCsvDecimal(totals.totalExpected),
      toCsvDecimal(totals.totalRevenue),
      toCsvDecimal(totals.totalDonations),
      toCsvDecimal(totals.balance),
    ].join(";");

    const csv = [header.join(";"), ...dataRows, sumRow].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finanzen-export-${getToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const eventsCount = filteredRows.length;
  const balanceColor = totals.balance > 0 ? "green" : totals.balance < 0 ? "red" : "gray";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-green-600" />
            Finanzen
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Finanzübersicht aller Veranstaltungen</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>
          <button
            onClick={exportCSV}
            disabled={sortedRows.length === 0}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-lg text-sm text-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <p className="text-center text-red-600 bg-red-50 rounded-xl py-6 px-4">{error}</p>
      ) : (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Gesamtkosten"
              value={formatEuro(totals.totalCosts)}
              sub={`${eventsCount} Veranstaltung${eventsCount !== 1 ? "en" : ""}`}
              color="gray"
              icon={<Wallet className="w-4 h-4 text-gray-500" />}
            />
            <SummaryCard
              label="Gesamtumsatz"
              value={formatEuro(totals.totalRevenue)}
              sub={`Erw. ${formatEuro(totals.totalExpected)}`}
              color="blue"
              icon={<Euro className="w-4 h-4 text-blue-500" />}
            />
            <SummaryCard
              label="Gesamtspenden"
              value={formatEuro(totals.totalDonations)}
              sub={`${eventsCount} Veranstaltung${eventsCount !== 1 ? "en" : ""}`}
              color="rose"
              icon={<Heart className="w-4 h-4 text-rose-500" />}
            />
            <SummaryCard
              label="Gesamtbilanz"
              value={`${totals.balance > 0 ? "+" : ""}${formatEuro(totals.balance)}`}
              sub={totals.balance > 0 ? "Überschuss" : totals.balance < 0 ? "Defizit" : "Ausgeglichen"}
              color={balanceColor}
              icon={
                totals.balance > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : totals.balance < 0 ? (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                ) : (
                  <Minus className="w-4 h-4 text-gray-400" />
                )
              }
            />
          </div>

          {/* ── Filter bar ── */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Period */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Zeitraum</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as Period)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[160px]"
                >
                  <option value="all">Alle</option>
                  <option value="this-year">Dieses Jahr</option>
                  <option value="last-month">Letzter Monat</option>
                  <option value="last-3-months">Letzte 3 Monate</option>
                  <option value="custom">Benutzerdefiniert</option>
                </select>
              </div>

              {/* Custom range */}
              {period === "custom" && (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Von</label>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-600">Bis</label>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                    />
                  </div>
                </>
              )}

              {/* Status */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[140px]"
                >
                  <option value="all">Alle</option>
                  <option value="past">Vergangene</option>
                  <option value="upcoming">Kommende</option>
                </select>
              </div>

              {/* Reset */}
              {(period !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => { setPeriod("all"); setStatusFilter("all"); setCustomFrom(""); setCustomTo(""); }}
                  className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Zurücksetzen
                </button>
              )}

              <p className="ml-auto text-xs text-gray-400 self-end pb-0.5">
                {eventsCount} Veranstaltung{eventsCount !== 1 ? "en" : ""}
              </p>
            </div>
          </div>

          {/* ── Table ── */}
          {sortedRows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 py-16 flex flex-col items-center gap-3">
              <BarChart3 className="w-10 h-10 text-gray-200" />
              <p className="text-gray-500 text-sm">Noch keine Veranstaltungen mit Finanzdaten.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <SortTh label="Event" sortKey="title" current={sortKey} dir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                        <SortTh label="Datum" sortKey="date" current={sortKey} dir={sortDir} onSort={handleSort} />
                        <SortTh label="Kosten" sortKey="total_costs" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                        <SortTh label="Erw. Umsatz" sortKey="expected_revenue" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                        <SortTh label="Tats. Umsatz" sortKey="actual_revenue" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                        <SortTh label="Spenden" sortKey="total_donations" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                        <SortTh label="Bilanz" sortKey="balance" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
                        <th className="px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((e, i) => {
                        const hasPrice = e.entry_price != null && e.entry_price > 0;
                        const donations = e.total_donations ?? 0;
                        const bal = e.balance;
                        return (
                          <tr
                            key={e.id}
                            className={`border-b border-gray-50 last:border-0 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}
                          >
                            <td className="px-3 py-3 font-medium text-gray-900 max-w-[240px]">
                              <Link
                                href={`/admin/finanzen/${e.id}`}
                                className="truncate block hover:text-green-700 hover:underline"
                                title="Finanzdetails öffnen"
                              >
                                {e.title}
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(e.date)}</td>
                            <td className="px-3 py-3 text-right text-gray-700 tabular-nums">
                              {formatEuro(e.total_costs ?? 0)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {hasPrice ? (
                                <span className="text-blue-700">{formatEuro(e.expected_revenue ?? 0)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {hasPrice ? (
                                <span className="text-green-700">{formatEuro(e.actual_revenue ?? 0)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              {donations > 0 ? (
                                <span className="text-rose-600">{formatEuro(donations)}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums">
                              <span
                                className={`inline-flex items-center gap-1 font-semibold ${
                                  bal > 0 ? "text-green-700" : bal < 0 ? "text-red-600" : "text-gray-500"
                                }`}
                              >
                                {bal > 0 ? (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                ) : bal < 0 ? (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                ) : (
                                  <Minus className="w-3.5 h-3.5" />
                                )}
                                {bal > 0 ? "+" : ""}
                                {formatEuro(bal)}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Link
                                  href={`/admin/finanzen/${e.id}`}
                                  title="Finanzdetails"
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Details
                                </Link>
                                <Link
                                  href={`/admin/events/${e.id}/dashboard`}
                                  title="Check-In Dashboard"
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 transition-colors"
                                >
                                  <LayoutDashboard className="w-3.5 h-3.5" />
                                  Dashboard
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Sum row */}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                        <td className="px-3 py-3 text-gray-700" colSpan={2}>
                          Gesamt ({eventsCount})
                        </td>
                        <td className="px-3 py-3 text-right text-gray-800 tabular-nums">
                          {formatEuro(totals.totalCosts)}
                        </td>
                        <td className="px-3 py-3 text-right text-blue-800 tabular-nums">
                          {formatEuro(totals.totalExpected)}
                        </td>
                        <td className="px-3 py-3 text-right text-green-800 tabular-nums">
                          {formatEuro(totals.totalRevenue)}
                        </td>
                        <td className="px-3 py-3 text-right text-rose-700 tabular-nums">
                          {totals.totalDonations > 0 ? formatEuro(totals.totalDonations) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              totals.balance > 0
                                ? "text-green-700"
                                : totals.balance < 0
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {totals.balance > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5" />
                            ) : totals.balance < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                            {totals.balance > 0 ? "+" : ""}
                            {formatEuro(totals.balance)}
                          </span>
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {sortedRows.map((e) => {
                  const bal = e.balance;
                  return (
                    <div key={e.id} className="border rounded-lg p-4 bg-white shadow-sm overflow-hidden">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/finanzen/${e.id}`}
                            className="font-medium text-gray-900 truncate block hover:text-green-700"
                          >
                            {e.title}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDate(e.date)}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-sm shrink-0 ${
                            bal > 0 ? "text-green-700" : bal < 0 ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {bal > 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : bal < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                          {bal > 0 ? "+" : ""}
                          {formatEuro(bal)}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                        <Link
                          href={`/admin/finanzen/${e.id}`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 bg-white transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Details
                        </Link>
                        <Link
                          href={`/admin/events/${e.id}/dashboard`}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-green-50 hover:text-green-600 bg-white transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          Dashboard
                        </Link>
                      </div>
                    </div>
                  );
                })}
                <div className="border rounded-lg p-4 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Gesamt ({eventsCount})</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold text-sm ${
                      totals.balance > 0 ? "text-green-700" : totals.balance < 0 ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    {totals.balance > 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : totals.balance < 0 ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5" />
                    )}
                    {totals.balance > 0 ? "+" : ""}
                    {formatEuro(totals.balance)}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
