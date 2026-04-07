"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Pencil, Trash2, Users, Loader2, Search, Ban, Globe, EyeOff } from "lucide-react";
import type { EventWithRegistrations } from "@/lib/types";

type CategoryFilter = "alle" | "fussball" | "fitness" | "schwimmen";

function getPublishedStatus(event: EventWithRegistrations): { label: string; variant: "default" | "secondary" | "destructive" | "cancelled" } {
  if (event.status === "cancelled") return { label: "Abgesagt", variant: "cancelled" };
  const today = new Date().toISOString().split("T")[0];
  if (event.date < today) return { label: "Beendet", variant: "destructive" };
  if (event.current_participants >= event.max_participants) return { label: "Ausgebucht", variant: "secondary" };
  return { label: "Aktiv", variant: "default" };
}

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

function EventRow({
  event,
  onDelete,
  onCancel,
  onPublish,
  onUnpublish,
  formatDate,
}: {
  event: EventWithRegistrations;
  onDelete: (e: EventWithRegistrations) => void;
  onCancel: (e: EventWithRegistrations) => void;
  onPublish: (e: EventWithRegistrations) => void;
  onUnpublish: (e: EventWithRegistrations) => void;
  formatDate: (d: string) => string;
}) {
  const isDraft = event.status === "draft";

  return (
    <TableRow className={isDraft ? "bg-amber-50/40" : undefined}>
      <TableCell className="font-medium">{event.title}</TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant={event.category as "fussball" | "fitness" | "schwimmen"}>
          {categoryLabels[event.category]}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">{formatDate(event.date)}</TableCell>
      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">{event.location}</TableCell>
      <TableCell className="hidden lg:table-cell">{event.price}</TableCell>
      <TableCell>
        {isDraft ? "–" : `${event.current_participants}/${event.max_participants}`}
      </TableCell>
      <TableCell>
        {isDraft ? (
          <Badge variant="draft">Entwurf</Badge>
        ) : (
          <Badge variant={getPublishedStatus(event).variant}>{getPublishedStatus(event).label}</Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Link href={`/admin/events/${event.id}/edit`}>
            <Button variant="ghost" size="icon" title="Bearbeiten">
              <Pencil className="w-4 h-4" />
            </Button>
          </Link>
          {!isDraft && (
            <Link href={`/admin/events/${event.id}/registrations`}>
              <Button variant="ghost" size="icon" title="Anmeldungen">
                <Users className="w-4 h-4" />
              </Button>
            </Link>
          )}
          {isDraft && (
            <Button variant="ghost" size="icon" title="Veröffentlichen" onClick={() => onPublish(event)}>
              <Globe className="w-4 h-4 text-green-600" />
            </Button>
          )}
          {event.status === "published" && (
            <Button variant="ghost" size="icon" title="Zurückziehen" onClick={() => onUnpublish(event)}>
              <EyeOff className="w-4 h-4 text-amber-600" />
            </Button>
          )}
          {event.status !== "cancelled" && (
            <Button
              variant="ghost"
              size="icon"
              title="Veranstaltung absagen"
              onClick={() => onCancel(event)}
            >
              <Ban className="w-4 h-4 text-purple-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Löschen"
            onClick={() => onDelete(event)}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function EventTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("alle");
  const [search, setSearch] = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<EventWithRegistrations | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<EventWithRegistrations | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Publish / unpublish state
  const [publishing, setPublishing] = useState<number | null>(null);

  const fetchEvents = () => {
    setLoading(true);
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => toast("Events konnten nicht geladen werden.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  // Apply search + category filter to both sections
  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (categoryFilter !== "alle" && e.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, categoryFilter, search]);

  const publishedEvents = useMemo(
    () => filtered.filter((e) => e.status !== "draft").sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [filtered]
  );
  const draftEvents = useMemo(
    () => filtered.filter((e) => e.status === "draft").sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [filtered]
  );

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  // ── Handlers ──

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/events/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler beim Löschen.", "error");
        return;
      }
      toast("Event gelöscht!", "success");
      setDeleteTarget(null);
      fetchEvents();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/events/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Absagen.", "error");
        return;
      }
      toast(
        `Veranstaltung abgesagt. ${data.emailsSent} E-Mail${data.emailsSent === 1 ? "" : "s"} versendet.`,
        "success"
      );
      setCancelTarget(null);
      setCancelReason("");
      fetchEvents();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handlePublish = async (event: EventWithRegistrations) => {
    setPublishing(event.id);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Veröffentlichen.", "error");
        return;
      }
      toast("Event veröffentlicht!", "success");
      fetchEvents();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setPublishing(null);
    }
  };

  const handleUnpublish = async (event: EventWithRegistrations) => {
    setPublishing(event.id);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/publish`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Zurückziehen.", "error");
        return;
      }
      toast("Event zurück in Planung gesetzt.", "success");
      fetchEvents();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  const tableColumns = (
    <TableHeader>
      <TableRow>
        <TableHead>Titel</TableHead>
        <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
        <TableHead className="hidden md:table-cell">Datum</TableHead>
        <TableHead className="hidden lg:table-cell">Ort</TableHead>
        <TableHead className="hidden lg:table-cell">Preis</TableHead>
        <TableHead>Plätze</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Aktionen</TableHead>
      </TableRow>
    </TableHeader>
  );

  const rowProps = {
    onDelete: setDeleteTarget,
    onCancel: (e: EventWithRegistrations) => { setCancelTarget(e); setCancelReason(""); },
    onPublish: handlePublish,
    onUnpublish: handleUnpublish,
    formatDate,
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Titel oder Ort suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)} className="w-full sm:w-40">
          <option value="alle">Alle Kategorien</option>
          <option value="fussball">Fußball</option>
          <option value="fitness">Fitness</option>
          <option value="schwimmen">Schwimmen</option>
        </Select>
      </div>

      {/* ── Section 1: Published events ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4 text-green-600" />
          Veröffentlichte Veranstaltungen
          <span className="text-xs font-normal text-muted-foreground">({publishedEvents.length})</span>
        </h2>
        {publishedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 pl-1">Keine veröffentlichten Events gefunden.</p>
        ) : (
          <div className="border rounded-lg">
            <Table>
              {tableColumns}
              <TableBody>
                {publishedEvents.map((event) => (
                  <EventRow key={event.id} event={event} {...rowProps}
                    onPublish={publishing === event.id ? () => {} : rowProps.onPublish}
                    onUnpublish={publishing === event.id ? () => {} : rowProps.onUnpublish}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── Section 2: Draft events ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-amber-500" />
          In Planung (Entwürfe)
          <span className="text-xs font-normal text-muted-foreground">({draftEvents.length})</span>
        </h2>
        {draftEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 pl-1">Keine Entwürfe vorhanden.</p>
        ) : (
          <div className="border rounded-lg border-amber-200">
            <Table>
              {tableColumns}
              <TableBody>
                {draftEvents.map((event) => (
                  <EventRow key={event.id} event={event} {...rowProps}
                    onPublish={publishing === event.id ? () => {} : rowProps.onPublish}
                    onUnpublish={publishing === event.id ? () => {} : rowProps.onUnpublish}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── Cancel confirmation dialog ── */}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Veranstaltung absagen</DialogTitle>
            <DialogDescription>
              Möchtest du die Veranstaltung &bdquo;{cancelTarget?.title}&ldquo; wirklich absagen?
              Alle Teilnehmer werden per E-Mail benachrichtigt.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="cancel-reason">Absagegrund (optional)</Label>
            <Textarea
              id="cancel-reason"
              placeholder="z.B. Schlechtes Wetter, Hallenausfall, ..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Veranstaltung absagen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event löschen</DialogTitle>
            <DialogDescription>
              Möchtest du das Event &bdquo;{deleteTarget?.title}&ldquo; wirklich löschen?
              Alle Anmeldungen werden ebenfalls gelöscht.
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
