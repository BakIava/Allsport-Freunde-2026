"use client";

import { useState, useEffect, useCallback } from "react";
import { History, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AuditLog, EntityType, AuditAction } from "@/lib/types";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Erstellt",
  UPDATE: "Aktualisiert",
  DELETE: "Gelöscht",
  PUBLISH: "Veröffentlicht",
  UNPUBLISH: "Zurückgezogen",
  CANCEL: "Abgesagt",
  APPROVE: "Genehmigt",
  REJECT: "Abgelehnt",
  CHECK_IN: "Eingecheckt",
  UNDO_CHECKIN: "Check-In rückgängig",
  PASSWORD_RESET: "Passwort-Reset",
  DEACTIVATE: "Deaktiviert",
  ACTIVATE: "Aktiviert",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  PUBLISH: "bg-emerald-100 text-emerald-800",
  UNPUBLISH: "bg-yellow-100 text-yellow-800",
  CANCEL: "bg-red-100 text-red-700",
  APPROVE: "bg-green-100 text-green-800",
  REJECT: "bg-red-100 text-red-800",
  CHECK_IN: "bg-purple-100 text-purple-800",
  UNDO_CHECKIN: "bg-gray-100 text-gray-700",
  PASSWORD_RESET: "bg-orange-100 text-orange-800",
  DEACTIVATE: "bg-red-100 text-red-700",
  ACTIVATE: "bg-green-100 text-green-700",
};

const ENTITY_LABELS: Record<string, string> = {
  EVENT: "Event",
  REGISTRATION: "Anmeldung",
  CHECKIN: "Check-In",
  TEMPLATE: "Vorlage",
  USER: "Benutzer",
  SYSTEM: "System",
};

function ChangesCell({ changes }: { changes: AuditLog["changes"] }) {
  const [open, setOpen] = useState(false);
  if (!changes) return null;
  const hasOld = changes.old && Object.keys(changes.old).length > 0;
  const hasNew = changes.new && Object.keys(changes.new).length > 0;
  if (!hasOld && !hasNew) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Details
      </button>
      {open && (
        <div className="mt-1 text-xs bg-gray-50 rounded p-2 border border-gray-200 space-y-1 max-w-xs">
          {hasOld && Object.entries(changes.old!).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <span className="text-gray-400">{k}:</span>
              <span className="text-red-600 font-mono line-through">{String(v ?? "—")}</span>
            </div>
          ))}
          {hasNew && Object.entries(changes.new!).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <span className="text-gray-400">{k}:</span>
              <span className="text-green-700 font-mono">{String(v ?? "—")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (entityType !== "all") params.set("entityType", entityType);
      if (action !== "all") params.set("action", action);
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (!res.ok) throw new Error("Fehler");
      setLogs(await res.json());
    } catch {
      setError("Audit-Logs konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [entityType, action]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter(
        (l) =>
          l.entity_label?.toLowerCase().includes(search.toLowerCase()) ||
          l.user_name?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-gray-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit-Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Alle Systemaktivitäten im Überblick</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Suche nach Benutzer oder Objekt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="w-full sm:w-44">
          <option value="all">Alle Typen</option>
          {(Object.entries(ENTITY_LABELS) as [EntityType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-full sm:w-44">
          <option value="all">Alle Aktionen</option>
          {(Object.entries(ACTION_LABELS) as [AuditAction, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Button variant="outline" onClick={load}>Aktualisieren</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Lade Audit-Logs…</div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">{filtered.length} Einträge</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Zeitpunkt</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Benutzer</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Aktion</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Typ</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Objekt</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Details</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">OK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        Keine Einträge gefunden.
                      </td>
                    </tr>
                  )}
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 font-medium">
                        {log.user_name ?? <span className="text-gray-400 italic">System</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">
                        {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                        {log.entity_id ? ` #${log.entity_id}` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 max-w-[200px] truncate text-xs">
                        {log.entity_label ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <ChangesCell changes={log.changes} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {log.success ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
