"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck,
  Pencil,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  FileText,
  AlertTriangle,
} from "lucide-react";
import type { Helper, HelperQualification } from "@/lib/types";
import { HELPER_QUALIFICATION_LABELS } from "@/lib/types";

const QUAL_COLORS: Record<
  HelperQualification,
  { bg: string; text: string; border: string }
> = {
  TRAINER: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  AUFSICHT: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  RETTUNGSSCHWIMMER: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function QualBadge({ q }: { q: HelperQualification }) {
  const c = QUAL_COLORS[q];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${c.bg} ${c.text} ${c.border}`}
    >
      {HELPER_QUALIFICATION_LABELS[q]}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function HelferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [helper, setHelper] = useState<Helper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/helfer/${id}`);
        if (res.status === 404) {
          setError("Helfer nicht gefunden.");
          return;
        }
        if (!res.ok) throw new Error();
        setHelper(await res.json());
      } catch {
        setError("Helfer konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleToggleActive() {
    if (!helper) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/admin/helfer/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...helper, is_active: !helper.is_active }),
      });
      if (!res.ok) throw new Error();
      setHelper(await res.json());
    } catch {
      setError("Status konnte nicht geändert werden.");
    } finally {
      setDeactivating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/helfer/${id}`, { method: "DELETE" });
      if (res.status === 409) {
        setError("Helfer hat Eventzuweisungen und kann nicht gelöscht werden.");
        setConfirmDelete(false);
        return;
      }
      if (!res.ok) throw new Error();
      router.push("/admin/helfer");
      router.refresh();
    } catch {
      setError("Helfer konnte nicht gelöscht werden.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !helper) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-red-600">{error ?? "Unbekannter Fehler"}</p>
        <Link href="/admin/helfer">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zur Liste
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <Link
        href="/admin/helfer"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Alle Helfer
      </Link>

      {/* Kopfzeile */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-green-100 p-2.5">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{helper.name}</h1>
            <Badge
              variant={helper.is_active ? "default" : "secondary"}
              className="mt-1"
            >
              {helper.is_active ? "Aktiv" : "Inaktiv"}
            </Badge>
          </div>
        </div>
        <Link href={`/admin/helfer/${id}/edit`}>
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Bearbeiten
          </Button>
        </Link>
      </div>

      {/* Fehlermeldung */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Daten-Karte */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Qualifikationen */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Qualifikationen
          </p>
          <div className="flex flex-wrap gap-2">
            {helper.qualifications.map((q) => (
              <QualBadge key={q} q={q} />
            ))}
          </div>
        </div>

        {/* E-Mail */}
        <div className="px-5 py-4 flex items-start gap-3">
          <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              E-Mail
            </p>
            {helper.email ? (
              <a href={`mailto:${helper.email}`} className="text-sm text-gray-900 hover:text-green-600">
                {helper.email}
              </a>
            ) : (
              <p className="text-sm text-gray-400">Nicht angegeben</p>
            )}
          </div>
        </div>

        {/* Telefon */}
        <div className="px-5 py-4 flex items-start gap-3">
          <Phone className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              Telefon
            </p>
            {helper.phone ? (
              <p className="text-sm text-gray-900">{helper.phone}</p>
            ) : (
              <p className="text-sm text-gray-400">Nicht angegeben</p>
            )}
          </div>
        </div>

        {/* Notizen */}
        <div className="px-5 py-4 flex items-start gap-3">
          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              Notizen
            </p>
            {helper.notes ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{helper.notes}</p>
            ) : (
              <p className="text-sm text-gray-400">Keine Notizen</p>
            )}
          </div>
        </div>

        {/* Metadaten */}
        <div className="px-5 py-3 text-xs text-gray-400 flex gap-4">
          <span>Angelegt: {formatDate(helper.created_at)}</span>
          <span>Geändert: {formatDate(helper.updated_at)}</span>
        </div>
      </div>

      {/* Aktions-Bereich */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-700">Aktionen</p>

        {/* Deaktivieren / Aktivieren */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleActive}
          disabled={deactivating}
          className={
            helper.is_active
              ? "border-amber-300 text-amber-700 hover:bg-amber-50"
              : "border-green-300 text-green-700 hover:bg-green-50"
          }
        >
          {deactivating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {helper.is_active ? "Helfer deaktivieren" : "Helfer reaktivieren"}
        </Button>

        {/* Hard-Delete */}
        {!confirmDelete ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="border-red-300 text-red-700 hover:bg-red-50 ml-2"
          >
            Helfer löschen
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-700 flex-1">
              Helfer dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.
            </p>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white shrink-0"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Löschen
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
