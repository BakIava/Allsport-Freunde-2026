"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  LayoutDashboard,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatEuro } from "@/lib/finance";

interface CheckinEvent {
  id: number;
  title: string;
  category: string;
  date: string;
  time: string;
  location: string;
  approved_count: number;
  checked_in_count: number;
  entry_price: number | null;
  total_costs: number;
  total_donations: number;
  expected_revenue: number;
  actual_revenue: number;
}

interface CheckinEventsResponse {
  today: CheckinEvent[];
  upcoming: CheckinEvent[];
  past: CheckinEvent[];
}

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{value} / {max} eingecheckt</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TodayCard({ event }: { event: CheckinEvent }) {
  return (
    <div className="bg-white rounded-xl border border-green-200 shadow-sm p-5 space-y-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-base leading-tight">{event.title}</h3>
          <span className="shrink-0 text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
            {categoryLabels[event.category] ?? event.category}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {event.time} Uhr
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {event.location}
          </span>
        </div>
      </div>

      <ProgressBar value={event.checked_in_count} max={event.approved_count} />

      {/* Compact finance line */}
      {(event.total_costs > 0 || (event.entry_price != null && event.entry_price > 0) || event.total_donations > 0) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 pt-1 border-t border-gray-100">
          {event.total_costs > 0 && (
            <span>Kosten: <strong className="text-gray-700">{formatEuro(event.total_costs)}</strong></span>
          )}
          {event.entry_price != null && event.entry_price > 0 && (
            <span>
              Umsatz: <strong className="text-gray-700">{formatEuro(event.actual_revenue)}</strong>
              <span className="text-gray-400"> / {formatEuro(event.expected_revenue)} erw.</span>
            </span>
          )}
          {event.total_donations > 0 && (
            <span className="text-rose-600">
              +<strong>{formatEuro(event.total_donations)}</strong> Spenden
            </span>
          )}
          {(event.total_costs > 0) && (() => {
            const balance = event.actual_revenue + event.total_donations - event.total_costs;
            return (
              <span className={`flex items-center gap-0.5 font-semibold ${balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-gray-500"}`}>
                {balance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {balance > 0 ? "+" : ""}{formatEuro(balance)}
              </span>
            );
          })()}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Link
          href={`/admin/events/${event.id}/scanner`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <QrCode className="w-4 h-4" />
          Scanner öffnen
        </Link>
        <Link
          href={`/admin/events/${event.id}/dashboard`}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function UpcomingCard({ event }: { event: CheckinEvent }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{event.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {event.time} Uhr
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {event.approved_count} Angemeldete
          </span>
        </div>
      </div>
      <Link
        href={`/admin/events/${event.id}/dashboard`}
        className="shrink-0 flex items-center gap-1.5 py-1.5 px-3 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-lg transition-colors"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        Dashboard
      </Link>
    </div>
  );
}

function PastCard({ event }: { event: CheckinEvent }) {
  return UpcomingCard({ event });
}

export default function CheckinOverviewPage() {
  const [data, setData] = useState<CheckinEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/admin/checkin/events");      
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-In</h1>
          <p className="text-sm text-gray-500 mt-0.5">Übersicht aller veröffentlichten Events</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Aktualisieren
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* ── Heute ── */}
          <section className="bg-green-50 border border-green-100 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-green-900 text-lg">Heute</h2>
              {data?.today && data.today.length > 0 && (
                <span className="ml-auto text-xs bg-green-600 text-white font-medium px-2 py-0.5 rounded-full">
                  {data.today.length} Event{data.today.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {!data?.today || data.today.length === 0 ? (
              <p className="text-sm text-green-700/60 py-4 text-center">
                Heute keine veröffentlichten Events.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.today.map((event) => (
                  <TodayCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>

          {/* ── Kommende Events ── */}
          <section className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Kommende Events
            </h2>

            {!data?.upcoming || data.upcoming.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                Keine kommenden veröffentlichten Events.
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.map((event) => (
                  <UpcomingCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>

          {/* ── Vergangene Events ── */}
          <section className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              Vergangene Events
            </h2>

            {!data?.past || data.past.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">
                Keine vergangenen veröffentlichten Events.
              </p>
            ) : (
              <div className="space-y-2">
                {data.past.map((event) => (
                  <PastCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
