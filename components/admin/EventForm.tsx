"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Loader2, Globe, EyeOff, LayoutTemplate } from "lucide-react";
import type { EventWithRegistrations, EventCreateInput, EventTemplate } from "@/lib/types";

interface EventFormProps {
  event?: EventWithRegistrations;
}

export default function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!event;
  const isDraft = !isEdit || event.status === "draft";

  const [formData, setFormData] = useState<EventCreateInput>({
    title: event?.title ?? "",
    category: event?.category ?? "fussball",
    description: event?.description ?? "",
    date: event?.date?.split("T")[0] ?? "",
    time: event?.time ?? "",
    location: event?.location ?? "",
    price: event?.price ?? "",
    dress_code: event?.dress_code ?? "",
    max_participants: event?.max_participants ?? 20,
  });
  const [submitting, setSubmitting] = useState(false);

  // Template selector
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Save-as-template dialog
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    fetch("/api/admin/templates")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch(() => { /* templates are optional, silently ignore */ });
  }, []);

  const applyTemplate = (id: string) => {
    const tpl = templates.find((t) => String(t.id) === id);
    if (!tpl) return;
    setFormData((prev) => ({
      ...prev,
      title: tpl.title,
      category: tpl.category,
      description: tpl.description,
      location: tpl.location,
      price: tpl.price,
      dress_code: tpl.dress_code,
      max_participants: tpl.max_participants,
    }));
    setSelectedTemplateId(id);
    // Record last usage
    fetch(`/api/admin/templates/${tpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "touch" }),
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent, publish: boolean) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = isEdit ? `/api/admin/events/${event.id}` : "/api/admin/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, publish }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Speichern.", "error");
        return;
      }

      // If editing a draft and publishing was requested, call the publish endpoint
      if (isEdit && publish && event.status === "draft") {
        const pubRes = await fetch(`/api/admin/events/${event.id}/publish`, { method: "POST" });
        if (!pubRes.ok) {
          const pubData = await pubRes.json();
          toast(pubData.error || "Gespeichert, aber Veröffentlichung fehlgeschlagen.", "error");
          router.push("/admin/events");
          router.refresh();
          return;
        }
      }

      if (publish) {
        toast(isEdit ? "Event gespeichert und veröffentlicht!" : "Event erstellt und veröffentlicht!", "success");
      } else {
        toast(isEdit ? "Event gespeichert." : "Event als Entwurf gespeichert.", "success");
      }
      router.push("/admin/events");
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          title: formData.title,
          category: formData.category,
          description: formData.description,
          location: formData.location,
          price: formData.price,
          dress_code: formData.dress_code,
          max_participants: formData.max_participants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Speichern der Vorlage.", "error");
        return;
      }
      toast(`Vorlage "${templateName.trim()}" gespeichert!`, "success");
      setSaveTemplateOpen(false);
      setTemplateName("");
      // Refresh template list so newly created template appears in dropdown
      fetch("/api/admin/templates")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setTemplates(data); })
        .catch(() => {});
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  const update = (field: keyof EventCreateInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Draft banner */}
      {isDraft && isEdit && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <EyeOff className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">
            Dieses Event ist noch nicht veröffentlicht und für die Öffentlichkeit unsichtbar.
          </p>
        </div>
      )}

      {/* Template selector – only for new events */}
      {!isEdit && templates.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <LayoutTemplate className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Label htmlFor="template-select" className="shrink-0 text-sm">
                  Aus Vorlage erstellen:
                </Label>
                <Select
                  id="template-select"
                  value={selectedTemplateId}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="flex-1"
                >
                  <option value="">– Vorlage wählen –</option>
                  {templates.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {selectedTemplateId && (
              <p className="text-xs text-muted-foreground mt-2 ml-8">
                Felder wurden aus der Vorlage vorausgefüllt. Alle Angaben können bearbeitet werden.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Event bearbeiten" : "Neues Event erstellen"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="z.B. Fußball-Turnier im Park"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategorie *</Label>
                <Select
                  id="category"
                  required
                  value={formData.category}
                  onChange={(e) => update("category", e.target.value as EventCreateInput["category"])}
                >
                  <option value="fussball">Fußball</option>
                  <option value="fitness">Fitness</option>
                  <option value="schwimmen">Schwimmen</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Datum *</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => update("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Uhrzeit *</Label>
                <Input
                  id="time"
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => update("time", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Ort / Adresse *</Label>
                <Input
                  id="location"
                  required
                  value={formData.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="z.B. Sportplatz Musterstraße 12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preis *</Label>
                <Input
                  id="price"
                  required
                  value={formData.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder='z.B. "Kostenlos", "5 €", "Spende"'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dress_code">Kleiderordnung</Label>
                <Input
                  id="dress_code"
                  value={formData.dress_code}
                  onChange={(e) => update("dress_code", e.target.value)}
                  placeholder="z.B. Sportkleidung & Hallenschuhe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_participants">Max. Teilnehmer *</Label>
                <Input
                  id="max_participants"
                  type="number"
                  required
                  min={1}
                  value={formData.max_participants}
                  onChange={(e) => update("max_participants", parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Freitext für Details zum Event..."
                rows={4}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {isDraft ? (
                <>
                  <Button
                    type="button"
                    disabled={submitting}
                    onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent, true); }}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                    Jetzt veröffentlichen
                  </Button>
                  <Button type="submit" variant="outline" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Als Entwurf speichern
                  </Button>
                </>
              ) : (
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Speichern...
                    </>
                  ) : (
                    "Änderungen speichern"
                  )}
                </Button>
              )}

              {/* Save-as-template button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => { setTemplateName(formData.title || ""); setSaveTemplateOpen(true); }}
              >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Als Vorlage speichern
              </Button>

              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Save-as-template dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={(o) => { if (!o) setSaveTemplateOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Als Vorlage speichern</DialogTitle>
            <DialogDescription>
              Die aktuellen Eventdaten (ohne Datum & Uhrzeit) werden als Vorlage gespeichert und
              können für künftige Events wiederverwendet werden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label htmlFor="template-name">Vorlagenname *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder='z.B. "Monatliches Vereinstraining"'
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveTemplate(); } }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setSaveTemplateOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Vorlage speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
