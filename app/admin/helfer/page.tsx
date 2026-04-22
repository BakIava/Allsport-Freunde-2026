"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  Plus,
  Search,
  Download,
  Loader2,
  RefreshCw,
  Filter,
} from "lucide-react";
import type { Helper, HelperQualification } from "@/lib/types";
import { HELPER_QUALIFICATION_LABELS } from "@/lib/types";

const ALL_QUALIFICATIONS: HelperQualification[] = [
  "TRAINER",
  "AUFSICHT",
  "RETTUNGSSCHWIMMER",
];

const QUAL_COLORS: Record<
  HelperQualification,
  { bg: string; text: string; border: string }
> = {
  TRAINER: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  AUFSICHT: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  RETTUNGSSCHWIMMER: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
};

function QualBadge({ q }: { q: HelperQualification }) {
  const c = QUAL_COLORS[q];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      {HELPER_QUALIFICATION_LABELS[q]}
    </span>
  );
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function HelferPage() {
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [qualFilter, setQualFilter] = useState<HelperQualification[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/helfer");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setHelpers(await res.json());
    } catch {
      setError("Helfer konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggleQualFilter(q: HelperQualification) {
    setQualFilter((prev) =>
      prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
    );
  }

  const filtered = useMemo(() => {
    return helpers.filter((h) => {
      if (!showInactive && !h.is_active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!h.name.toLowerCase().includes(q)) return false;
      }
      if (qualFilter.length > 0) {
        if (!qualFilter.some((q) => h.qualifications.includes(q))) return false;
      }
      return true;
    });
  }, [helpers, search, qualFilter, showInactive]);

  function exportCSV() {
    const header = ["Name", "E-Mail", "Telefon", "Qualifikationen", "Status", "Notizen"];
    const dataRows = filtered.map((h) =>
      [
        `"${h.name.replace(/"/g, '""')}"`,
        h.email ? `"${h.email}"` : '""',
        h.phone ? `"${h.phone}"` : '""',
        `"${h.qualifications.map((q) => HELPER_QUALIFICATION_LABELS[q]).join(", ")}"`,
        h.is_active ? "Aktiv" : "Inaktiv",
        h.notes ? `"${h.notes.replace(/"/g, '""')}"` : '""',
      ].join(";")
    );

    const csv = [header.join(";"), ...dataRows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helfer-export-${getToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeCount = helpers.filter((h) => h.is_active).length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Helfer</h1>
            {!loading && !error && (
              <p className="text-sm text-gray-500">
                {activeCount} aktive{activeCount === 1 ? "r" : ""} Helfer
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} title="Aktualisieren">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Aktualisieren</span>
          </Button>
          <Link href="/admin/helfer/new">
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-1" />
              Neuer Helfer
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter-Leiste */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
        {/* Suche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name suchen…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Qualifikationsfilter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {ALL_QUALIFICATIONS.map((q) => {
              const active = qualFilter.includes(q);
              return (
                <button
                  key={q}
                  onClick={() => toggleQualFilter(q)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    active
                      ? `${QUAL_COLORS[q].bg} ${QUAL_COLORS[q].text} ${QUAL_COLORS[q].border}`
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {HELPER_QUALIFICATION_LABELS[q]}
                </button>
              );
            })}
          </div>

          {/* Inaktive anzeigen */}
          <label className="flex items-center gap-2 cursor-pointer ml-auto text-sm text-gray-600 select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            Auch inaktive anzeigen
          </label>
        </div>
      </div>

      {/* Inhalt */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={load}>
            Erneut versuchen
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {helpers.length === 0
            ? "Noch keine Helfer angelegt."
            : "Keine Helfer entsprechen den Filterkriterien."}
        </div>
      ) : (
        <>
          {/* CSV-Export + Anzahl */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">
              {filtered.length} Helfer{filtered.length !== helpers.length && ` von ${helpers.length}`}
            </p>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV-Export
            </Button>
          </div>

          {/* Desktop-Tabelle */}
          <div className="hidden md:block rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Qualifikationen</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">E-Mail</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telefon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((h) => (
                  <tr
                    key={h.id}
                    className={`hover:bg-gray-50 transition-colors ${!h.is_active ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {h.qualifications.map((q) => (
                          <QualBadge key={q} q={q} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.email ? (
                        <a href={`mailto:${h.email}`} className="hover:text-green-600">
                          {h.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.phone ?? <span className="text-gray-400">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={h.is_active ? "default" : "secondary"}>
                        {h.is_active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/helfer/${h.id}`}>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile-Karten */}
          <div className="md:hidden space-y-3">
            {filtered.map((h) => (
              <div
                key={h.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 ${!h.is_active ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{h.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {h.qualifications.map((q) => (
                        <QualBadge key={q} q={q} />
                      ))}
                    </div>
                  </div>
                  <Badge variant={h.is_active ? "default" : "secondary"} className="shrink-0">
                    {h.is_active ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>
                {(h.email || h.phone) && (
                  <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                    {h.email && (
                      <p>
                        <a href={`mailto:${h.email}`} className="hover:text-green-600">
                          {h.email}
                        </a>
                      </p>
                    )}
                    {h.phone && <p>{h.phone}</p>}
                  </div>
                )}
                <Link href={`/admin/helfer/${h.id}`}>
                  <Button size="sm" variant="outline" className="w-full">
                    Details anzeigen
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
