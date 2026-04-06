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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/status/StatusBadge";
import { Trash2, Loader2, Search, Download, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { RegistrationWithEvent, RegistrationStatus } from "@/lib/types";

interface RegistrationTableProps {
  eventId?: number;
}

export default function RegistrationTable({ eventId }: RegistrationTableProps) {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState<string>("alle");
  const [deleteTarget, setDeleteTarget] = useState<RegistrationWithEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<RegistrationStatus>("approved");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ reg: RegistrationWithEvent; status: RegistrationStatus } | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusProcessing, setStatusProcessing] = useState(false);

  const fetchRegistrations = () => {
    setLoading(true);
    const url = eventId
      ? `/api/admin/events/${eventId}/registrations`
      : "/api/admin/registrations";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setRegistrations(data);
        setSelectedIds(new Set());
      })
      .catch(() => toast("Anmeldungen konnten nicht geladen werden.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRegistrations(); }, [eventId]);

  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      if (categoryFilter !== "alle" && r.event_category !== categoryFilter) return false;
      if (statusFilter !== "alle" && r.status !== statusFilter) return false;
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
  }, [registrations, search, categoryFilter, statusFilter]);

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

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setStatusProcessing(true);
    try {
      const res = await fetch(`/api/admin/registrations/${statusTarget.reg.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusTarget.status, note: statusNote || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler beim Statuswechsel.", "error");
        return;
      }
      toast(
        statusTarget.status === "approved" ? "Anmeldung bestätigt!" : "Anmeldung abgelehnt.",
        "success"
      );
      setStatusTarget(null);
      setStatusNote("");
      fetchRegistrations();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setStatusProcessing(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/registrations/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status: bulkStatus,
          note: bulkNote || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler bei Bulk-Aktion.", "error");
        return;
      }
      toast(`${selectedIds.size} Anmeldung(en) aktualisiert!`, "success");
      setBulkAction(false);
      setBulkNote("");
      fetchRegistrations();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
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
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-40">
          <option value="alle">Alle Status</option>
          <option value="pending">Ausstehend</option>
          <option value="approved">Bestätigt</option>
          <option value="rejected">Abgelehnt</option>
        </Select>
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

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.size} ausgewählt
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-green-700 border-green-300 hover:bg-green-50"
            onClick={() => { setBulkStatus("approved"); setBulkAction(true); }}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Bestätigen
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-700 border-red-300 hover:bg-red-50"
            onClick={() => { setBulkStatus("rejected"); setBulkAction(true); }}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Ablehnen
          </Button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Keine Anmeldungen gefunden.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">E-Mail</TableHead>
                <TableHead className="hidden md:table-cell">Gäste</TableHead>
                <TableHead>Status</TableHead>
                {!eventId && <TableHead className="hidden lg:table-cell">Event</TableHead>}
                <TableHead className="hidden sm:table-cell">Datum</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{r.first_name} {r.last_name}</span>
                      <span className="block sm:hidden text-xs text-gray-500">{r.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{r.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{r.guests}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status || "pending"} />
                  </TableCell>
                  {!eventId && <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{r.event_title}</TableCell>}
                  <TableCell className="hidden sm:table-cell">{formatDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== "approved" && r.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Bestätigen"
                          onClick={() => setStatusTarget({ reg: r, status: "approved" })}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      {r.status !== "rejected" && r.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ablehnen"
                          onClick={() => setStatusTarget({ reg: r, status: "rejected" })}
                        >
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                      {r.status !== "pending" && r.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Auf ausstehend setzen"
                          onClick={() => setStatusTarget({ reg: r, status: "pending" })}
                        >
                          <Clock className="w-4 h-4 text-amber-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Löschen"
                        onClick={() => setDeleteTarget(r)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{filtered.length} Anmeldung{filtered.length !== 1 ? "en" : ""}</p>

      {/* Status change dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => { if (!o) { setStatusTarget(null); setStatusNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {statusTarget?.status === "approved" ? "Anmeldung bestätigen" : statusTarget?.status === "rejected" ? "Anmeldung ablehnen" : "Status ändern"}
            </DialogTitle>
            <DialogDescription>
              {statusTarget?.reg.first_name} {statusTarget?.reg.last_name} – {statusTarget?.reg.event_title}
            </DialogDescription>
          </DialogHeader>
          {statusTarget?.status === "rejected" && (
            <div className="space-y-2">
              <Label htmlFor="status-note">Begründung (optional)</Label>
              <Textarea
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Grund für die Ablehnung..."
                rows={3}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setStatusTarget(null); setStatusNote(""); }}>
              Abbrechen
            </Button>
            <Button
              variant={statusTarget?.status === "rejected" ? "destructive" : "default"}
              onClick={handleStatusChange}
              disabled={statusProcessing}
            >
              {statusProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {statusTarget?.status === "approved" ? "Bestätigen" : statusTarget?.status === "rejected" ? "Ablehnen" : "Ändern"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk action dialog */}
      <Dialog open={bulkAction} onOpenChange={(o) => { if (!o) { setBulkAction(false); setBulkNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkStatus === "approved" ? `${selectedIds.size} Anmeldung(en) bestätigen` : `${selectedIds.size} Anmeldung(en) ablehnen`}
            </DialogTitle>
            <DialogDescription>
              Diese Aktion betrifft alle ausgewählten Anmeldungen. E-Mail-Benachrichtigungen werden versendet.
            </DialogDescription>
          </DialogHeader>
          {bulkStatus === "rejected" && (
            <div className="space-y-2">
              <Label htmlFor="bulk-note">Begründung (optional)</Label>
              <Textarea
                id="bulk-note"
                value={bulkNote}
                onChange={(e) => setBulkNote(e.target.value)}
                placeholder="Grund für die Ablehnung..."
                rows={3}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setBulkAction(false); setBulkNote(""); }}>
              Abbrechen
            </Button>
            <Button
              variant={bulkStatus === "rejected" ? "destructive" : "default"}
              onClick={handleBulkAction}
              disabled={bulkProcessing}
            >
              {bulkProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {bulkStatus === "approved" ? "Alle bestätigen" : "Alle ablehnen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
