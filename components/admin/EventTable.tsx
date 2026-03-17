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
import { useToast } from "@/components/ui/toast";
import { Pencil, Trash2, Users, Loader2, Search } from "lucide-react";
import type { EventWithRegistrations } from "@/lib/types";

type StatusFilter = "alle" | "aktiv" | "ausgebucht" | "beendet";

function getStatus(event: EventWithRegistrations): { label: string; variant: "default" | "secondary" | "destructive" } {
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

export default function EventTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventWithRegistrations | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = () => {
    setLoading(true);
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then(setEvents)
      .catch(() => toast("Events konnten nicht geladen werden.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (categoryFilter !== "alle" && e.category !== categoryFilter) return false;
      if (statusFilter !== "alle") {
        const status = getStatus(e);
        if (statusFilter === "aktiv" && status.label !== "Aktiv") return false;
        if (statusFilter === "ausgebucht" && status.label !== "Ausgebucht") return false;
        if (statusFilter === "beendet" && status.label !== "Beendet") return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.location.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [events, categoryFilter, statusFilter, search]);

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

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

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
            placeholder="Titel oder Ort suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full sm:w-40">
          <option value="alle">Alle Kategorien</option>
          <option value="fussball">Fußball</option>
          <option value="fitness">Fitness</option>
          <option value="schwimmen">Schwimmen</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="w-full sm:w-36">
          <option value="alle">Alle Status</option>
          <option value="aktiv">Aktiv</option>
          <option value="ausgebucht">Ausgebucht</option>
          <option value="beendet">Beendet</option>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Keine Events gefunden.</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
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
            <TableBody>
              {filtered.map((event) => {
                const status = getStatus(event);
                return (
                  <TableRow key={event.id}>
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
                      {event.current_participants}/{event.max_participants}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Button variant="ghost" size="icon" title="Bearbeiten">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/registrations`}>
                          <Button variant="ghost" size="icon" title="Anmeldungen">
                            <Users className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Löschen"
                          onClick={() => setDeleteTarget(event)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
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
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Löschen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
