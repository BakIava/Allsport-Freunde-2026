"use client";

import { useState, useEffect, useCallback } from "react";
import { X, History, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import type { AuditLog, EntityType } from "@/lib/types";

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
  LOGIN: "Angemeldet",
  PASSWORD_RESET: "Passwort zurückgesetzt",
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

interface Props {
  entityType: EntityType;
  entityId: number;
  entityLabel: string;
  onClose: () => void;
}

interface ChangesViewProps {
  changes: AuditLog["changes"];
}

function ChangesView({ changes }: ChangesViewProps) {
  const [open, setOpen] = useState(false);
  if (!changes) return null;
  const hasOld = changes.old && Object.keys(changes.old).length > 0;
  const hasNew = changes.new && Object.keys(changes.new).length > 0;
  if (!hasOld && !hasNew) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Details anzeigen
      </button>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-2 text-xs bg-gray-50 rounded p-2 border border-gray-200">
          {hasOld && (
            <div>
              <div className="font-semibold text-gray-500 mb-1">Vorher</div>
              {Object.entries(changes.old!).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <span className="text-gray-500">{k}:</span>
                  <span className="text-red-700 font-mono">{String(v ?? "—")}</span>
                </div>
              ))}
            </div>
          )}
          {hasNew && (
            <div>
              <div className="font-semibold text-gray-500 mb-1">Nachher</div>
              {Object.entries(changes.new!).map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <span className="text-gray-500">{k}:</span>
                  <span className="text-green-700 font-mono">{String(v ?? "—")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AuditLogModal({ entityType, entityId, entityLabel, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit-logs/${entityType}/${entityId}`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      setLogs(await res.json());
    } catch {
      setError("Verlauf konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500" />
              Änderungsverlauf
            </h2>
            <p className="text-sm text-gray-500 truncate">{entityLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12 text-gray-400">Lade Verlauf…</div>
          )}
          {error && (
            <div className="text-center py-12 text-red-500">{error}</div>
          )}
          {!loading && !error && logs.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Keine Einträge im Verlauf vorhanden.
            </div>
          )}
          {!loading && !error && logs.length > 0 && (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-4 pl-10 relative">
                    {/* Dot */}
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: log.success ? "#22c55e" : "#ef4444" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                        {log.success ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {new Date(log.timestamp).toLocaleString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Benutzer: <span className="font-medium text-gray-700">{log.user_name ?? "System"}</span>
                        {log.ip_address && ` · IP: ${log.ip_address}`}
                      </div>
                      <ChangesView changes={log.changes} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex-shrink-0 flex items-center justify-between text-xs text-gray-400">
          <span>{logs.length} Einträge</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-medium">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
