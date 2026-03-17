"use client";

import { useState, useEffect, useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Trash2, Loader2, Search, Download } from "lucide-react";
import type { RegistrationWithEvent } from "@/lib/types";

interface RegistrationTableProps {
  eventId?: number;
}

export default function RegistrationTable({ eventId }: RegistrationTableProps) {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const [deleteTarget, setDeleteTarget] = useState<RegistrationWithEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRegistrations = () => {
    setLoading(true);
    const url = eventId
      ? `/api/admin/events/${eventId}/registrations`
      : "/api/admin/registrations";
    fetch(url)
      .then((r) => r.json())
      .then(setRegistrations)
      .catch(() => toast("Anmeldungen konnten nicht geladen werden.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRegistrations(); }, [eventId]);

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (categoryFilter !== "alle" && r.event_category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.first_name.toLowerCase().includes(q) &&
          !r.last_name.toLowerCase().includes(q) &&
          !r.email.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [registrations, search, categoryFilter]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/registrations/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler beim Löschen.", "error");
        return;
      }
      toast("Anmeldung gelöscht!", "success");
      setDeleteTarget(null);
      fetchRegistrations();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = () => {
    const url = eventId
      ? `/api/admin/registrations/export?event_id=${eventId}`
      : "/api/admin/registrations/export";
    window.open(url, "_blank");
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateTime = (d: string) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Name oder E-Mail suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {!eventId && (
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-40">
            <option value="alle">Alle Kategorien</option>
            <option value="fussball">Fußball</option>
            <option value="fitness">Fitness</option>
            <option value="schwimmen">Schwimmen</option>
          </Select>
        )}
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          CSV Export
        </Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Keine Anmeldungen gefunden.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vorname</TableHead>
                <TableHead>Nachname</TableHead>
                <TableHead className="hidden sm:table-cell">E-Mail</TableHead>
                <TableHead className="hidden md:table-cell">Telefon</TableHead>
                <TableHead className="hidden md:table-cell">Gäste</TableHead>
                {!eventId && <TableHead className="hidden lg:table-cell">Event</TableHead>}
                {!eventId && <TableHead className="hidden lg:table-cell">Event-Datum</TableHead>}
                <TableHead className="hidden sm:table-cell">Anmeldedatum</TableHead>
                <TableHead className="text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.first_name}</TableCell>
                  <TableCell>{r.last_name}</TableCell>
                  <TableCell className="hidden sm:table-cell">{r.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.phone || "–"}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.guests}</TableCell>
                  {!eventId && <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{r.event_title}</TableCell>}
                  {!eventId && <TableCell className="hidden lg:table-cell">{formatDate(r.event_date)}</TableCell>}
                  <TableCell className="hidden sm:table-cell">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Löschen"
                      onClick={() => setDeleteTarget(r)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} Anmeldung{filtered.length !== 1 ? "en" : ""}</p>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anmeldung löschen</DialogTitle>
            <DialogDescription>
              Möchtest du die Anmeldung von {deleteTarget?.first_name} {deleteTarget?.last_name} wirklich löschen?
              Der Platz wird wieder freigegeben.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
