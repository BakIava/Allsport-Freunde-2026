"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Pencil, Trash2, Copy, Loader2, Plus } from "lucide-react";
import type { EventTemplate } from "@/lib/types";

const categoryLabels: Record<string, string> = {
  fussball: "Fußball",
  fitness: "Fitness",
  schwimmen: "Schwimmen",
};

function formatLastUsed(ts: string | null): string {
  if (!ts) return "Noch nie";
  return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TemplateList() {
  const router = useRouter();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EventTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => toast("Vorlagen konnten nicht geladen werden.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/templates/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler beim Löschen.", "error");
        return;
      }
      toast("Vorlage gelöscht!", "success");
      setDeleteTarget(null);
      fetchTemplates();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (tpl: EventTemplate) => {
    setDuplicating(tpl.id);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Kopie von ${tpl.name}`,
          title: tpl.title,
          category: tpl.category,
          description: tpl.description,
          location: tpl.location,
          price: tpl.price,
          dress_code: tpl.dress_code,
          max_participants: tpl.max_participants,
          images: tpl.images ?? [],
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Fehler beim Duplizieren.", "error");
        return;
      }
      toast("Vorlage dupliziert!", "success");
      fetchTemplates();
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setDuplicating(null);
    }
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
      {templates.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-gray-50">
          <p className="text-muted-foreground mb-4">Noch keine Vorlagen vorhanden.</p>
          <Link href="/admin/templates/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Erste Vorlage erstellen
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vorlagenname</TableHead>
                <TableHead>Standard-Titel</TableHead>
                <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
                <TableHead className="hidden md:table-cell">Ort</TableHead>
                <TableHead className="hidden lg:table-cell">Kapazität</TableHead>
                <TableHead className="hidden lg:table-cell">Zuletzt genutzt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell className="font-medium">{tpl.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{tpl.title}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={tpl.category as "fussball" | "fitness" | "schwimmen"}>
                      {categoryLabels[tpl.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[180px] truncate text-sm">{tpl.location}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{tpl.max_participants} Plätze</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatLastUsed(tpl.last_used_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/templates/${tpl.id}/edit`}>
                        <Button variant="ghost" size="icon" title="Bearbeiten">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Duplizieren"
                        onClick={() => handleDuplicate(tpl)}
                        disabled={duplicating === tpl.id}
                      >
                        {duplicating === tpl.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Copy className="w-4 h-4 text-blue-500" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Löschen"
                        onClick={() => setDeleteTarget(tpl)}
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

      {/* Delete dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vorlage löschen</DialogTitle>
            <DialogDescription>
              Möchtest du die Vorlage &bdquo;{deleteTarget?.name}&ldquo; wirklich löschen?
              Bestehende Events werden nicht beeinflusst.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Abbrechen</Button>
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
