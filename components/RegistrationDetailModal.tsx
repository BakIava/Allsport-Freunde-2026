"use client";

import { useEffect } from "react";
import { X, Loader2, User, Calendar, CheckCircle2, Info } from "lucide-react";
import StatusBadge from "@/components/status/StatusBadge";
import type { RegistrationDetail } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  data: RegistrationDetail | null;
  error?: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 min-w-[150px] shrink-0">{label}</span>
      <span className="text-sm text-gray-900 break-words min-w-0 flex-1">
        {value !== null && value !== undefined && value !== "" ? (
          value
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </span>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="bg-gray-50 rounded-lg px-4 py-1">{children}</div>
    </div>
  );
}

export default function RegistrationDetailModal({
  open,
  onClose,
  loading,
  data,
  error,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-50 w-full sm:max-w-lg max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-border bg-background shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 sm:zoom-in-95"
        role="dialog"
        aria-modal="true"
        aria-label="Anmeldungs-Details"
      >
        {/* Sticky header */}
        <div className="sticky top-0 bg-background z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-gray-900">
            Anmeldungs-Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
            type="button"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 text-center">
              {error}
            </p>
          )}

          {data && !loading && (
            <>
              {/* Persönliche Daten */}
              <Section title="Persönliche Daten" icon={User}>
                <Row label="Vorname" value={data.first_name} />
                <Row label="Nachname" value={data.last_name} />
                <Row label="E-Mail" value={data.email} />
                <Row label="Telefonnummer" value={data.phone} />
              </Section>

              {/* Anmeldungs-Details */}
              <Section title="Anmeldungs-Details" icon={Info}>
                <Row label="Anmeldungs-ID" value={`#${data.id}`} />
                <Row
                  label="Angemeldet am"
                  value={formatDateTime(data.created_at)}
                />
                <Row
                  label="Status"
                  value={<StatusBadge status={data.status} />}
                />
                {data.status_changed_at && (
                  <Row
                    label="Status geändert am"
                    value={formatDateTime(data.status_changed_at)}
                  />
                )}
                {data.status_note && (
                  <Row label="Status-Hinweis" value={data.status_note} />
                )}
                <Row
                  label="Event"
                  value={
                    data.event_title +
                    " · " +
                    formatDate(data.event_date) +
                    (data.event_time ? " · " + data.event_time + " Uhr" : "")
                  }
                />
                <Row label="Veranstaltungsort" value={data.event_location} />
                <Row
                  label="Begleitpersonen"
                  value={
                    data.guests > 0
                      ? `${data.guests} Person${data.guests !== 1 ? "en" : ""}`
                      : "Keine"
                  }
                />
                <Row
                  label="Walk-in"
                  value={
                    data.is_walk_in ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        Ja
                      </span>
                    ) : (
                      "Nein"
                    )
                  }
                />
                {data.notes && (
                  <Row label="Interne Notizen" value={data.notes} />
                )}
              </Section>

              {/* Check-In */}
              <Section title="Check-In" icon={CheckCircle2}>
                <Row
                  label="Eingecheckt"
                  value={
                    data.checked_in_at ? (
                      <span className="font-medium text-green-700">Ja</span>
                    ) : (
                      <span className="text-gray-400">Nein</span>
                    )
                  }
                />
                {data.checked_in_at && (
                  <>
                    <Row
                      label="Eingecheckt am"
                      value={formatDateTime(data.checked_in_at)}
                    />
                    <Row
                      label="Eingecheckt von"
                      value={data.checked_in_by}
                    />
                  </>
                )}
              </Section>

              {/* Technische Details */}
              <Section title="Technische Details" icon={Calendar}>
                <Row label="Anmeldungs-ID" value={`#${data.id}`} />
                <Row label="Event-ID" value={`#${data.event_id}`} />
                <Row
                  label="Status-Seite"
                  value={
                    data.status_token ? (
                      <span className="font-mono text-xs text-gray-400">
                        {data.status_token.slice(0, 20)}…
                      </span>
                    ) : null
                  }
                />
                <Row
                  label="QR-Code"
                  value={
                    data.qr_token ? (
                      <span className="text-green-700 text-xs font-medium">
                        Generiert
                      </span>
                    ) : (
                      <span className="text-gray-400">Nicht generiert</span>
                    )
                  }
                />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
