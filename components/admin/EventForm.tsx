"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Loader2, Globe, EyeOff, LayoutTemplate, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, Euro } from "lucide-react";
import { Reorder } from "framer-motion";
import type { EventWithRegistrations, EventCreateInput, EventTemplate, EventImageInput, EventCost } from "@/lib/types";
import { formatEuro } from "@/lib/finance";

interface EventFormProps {
  event?: EventWithRegistrations;
}

interface ImageEntry {
  _key: string;
  url: string;
  alt_text: string;
  /** null = not validated yet, true = valid image URL, false = invalid */
  valid: boolean | null;
}

function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      resolve(false);
      return;
    }
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Timeout after 5s
    setTimeout(() => resolve(false), 5000);
  });
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
    parking_location: event?.parking_location ?? "",
    price: event?.price ?? "",
    entry_price: event?.entry_price ?? null,
    dress_code: event?.dress_code ?? "",
    max_participants: event?.max_participants ?? 20,
  });
  const [submitting, setSubmitting] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

  // ── Costs state (edit mode only) ──────────────────────
  const [costs, setCosts] = useState<EventCost[]>([]);
  const [costsLoading, setCostsLoading] = useState(false);
  // editing an existing cost row
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  // new cost row
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [addingCost, setAddingCost] = useState(false);

  useEffect(() => {
    if (!isEdit || !event?.id) return;
    setCostsLoading(true);
    fetch(`/api/admin/events/${event.id}/costs`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCosts(data); })
      .catch(() => {})
      .finally(() => setCostsLoading(false));
  }, [isEdit, event?.id]);

  const totalCosts = costs.reduce((s, c) => s + c.amount, 0);

  async function handleAddCost() {
    if (!newDesc.trim() || !newAmount.trim() || !event?.id) return;
    const amount = parseFloat(newAmount.replace(",", "."));
    if (isNaN(amount) || amount < 0) { toast("Ungültiger Betrag.", "error"); return; }
    setAddingCost(true);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc.trim(), amount }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Fehler.", "error"); return; }
      setCosts((prev) => [...prev, data]);
      setNewDesc("");
      setNewAmount("");
    } catch { toast("Netzwerkfehler.", "error"); }
    finally { setAddingCost(false); }
  }

  function startEditCost(cost: EventCost) {
    setEditingCostId(cost.id);
    setEditDesc(cost.description);
    setEditAmount(String(cost.amount));
  }

  async function saveEditCost(costId: number) {
    if (!event?.id) return;
    const amount = parseFloat(editAmount.replace(",", "."));
    if (!editDesc.trim() || isNaN(amount) || amount < 0) { toast("Ungültige Eingabe.", "error"); return; }
    try {
      const res = await fetch(`/api/admin/events/${event.id}/costs/${costId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDesc.trim(), amount }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Fehler.", "error"); return; }
      setCosts((prev) => prev.map((c) => (c.id === costId ? data : c)));
      setEditingCostId(null);
    } catch { toast("Netzwerkfehler.", "error"); }
  }

  async function handleDeleteCost(costId: number) {
    if (!event?.id) return;
    try {
      const res = await fetch(`/api/admin/events/${event.id}/costs/${costId}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); toast(d.error || "Fehler.", "error"); return; }
      setCosts((prev) => prev.filter((c) => c.id !== costId));
    } catch { toast("Netzwerkfehler.", "error"); }
  }

  // Image management
  const [images, setImages] = useState<ImageEntry[]>(() =>
    (event?.images ?? []).map((img) => ({
      _key: String(img.id),
      url: img.url,
      alt_text: img.alt_text,
      valid: true,
    }))
  );

  const addImage = () => {
    setImages((prev) => [...prev, { _key: crypto.randomUUID(), url: "", alt_text: "", valid: null }]);
  };

  const removeImage = (key: string) => {
    setImages((prev) => prev.filter((i) => i._key !== key));
  };

  const updateImage = (key: string, field: "url" | "alt_text", value: string) => {
    setImages((prev) =>
      prev.map((i) => (i._key === key ? { ...i, [field]: value, valid: field === "url" ? null : i.valid } : i))
    );
  };

  const validateImage = useCallback(async (key: string, url: string) => {
    if (!url.trim()) {
      setImages((prev) => prev.map((i) => (i._key === key ? { ...i, valid: null } : i)));
      return;
    }
    const ok = await validateImageUrl(url);
    setImages((prev) => prev.map((i) => (i._key === key ? { ...i, valid: ok } : i)));
  }, []);

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
      entry_price: tpl.entry_price ?? null,
      dress_code: tpl.dress_code,
      max_participants: tpl.max_participants,
    }));
    // Pre-fill images from template
    setImages(
      (tpl.images ?? []).map((img) => ({
        _key: crypto.randomUUID(),
        url: img.url,
        alt_text: img.alt_text,
        valid: true,
      }))
    );
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

      const imagePayload: EventImageInput[] = images
        .filter((i) => i.url.trim())
        .map((i, idx) => ({ url: i.url.trim(), alt_text: i.alt_text.trim(), position: idx }));

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, images: imagePayload, publish }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Speichern.", "error");
        return;
      }

      // After creating a new event from a template, apply template cost positions
      if (!isEdit && data.id && selectedTemplateId) {
        const tpl = templates.find((t) => String(t.id) === selectedTemplateId);
        const tplCosts = tpl?.template_costs ?? [];
        for (const c of tplCosts) {
          await fetch(`/api/admin/events/${data.id}/costs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: c.description, amount: c.amount }),
          }).catch(() => {});
        }
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
          entry_price: formData.entry_price ?? null,
          dress_code: formData.dress_code,
          max_participants: formData.max_participants,
          template_costs: costs.map((c) => ({ description: c.description, amount: c.amount })),
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

  const update = (field: keyof EventCreateInput, value: string | number | null) => {
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
                  placeholder="z.B. Sportplatz Musterstraße 12, Frankfurt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="parking_location">Parkplatz-Adresse</Label>
                <Input
                  id="parking_location"
                  value={formData.parking_location ?? ""}
                  onChange={(e) => update("parking_location", e.target.value)}
                  placeholder="z.B. Parkplatz Musterstraße, Frankfurt (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preis (Anzeige) *</Label>
                <Input
                  id="price"
                  required
                  value={formData.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder='z.B. "Kostenlos", "5 €", "Spende"'
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry_price">Eintrittspreis (€, für Umsatzberechnung)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="entry_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.entry_price ?? ""}
                    onChange={(e) => update("entry_price", e.target.value === "" ? null : parseFloat(e.target.value))}
                    placeholder="0,00 – leer lassen wenn kostenlos"
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Wird für die automatische Umsatz- und Bilanzberechnung verwendet.</p>
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
                    onClick={() => setPublishConfirmOpen(true)}
                  >
                    <Globe className="w-4 h-4 mr-2" />
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

      {/* ── Kostenpositionen (nur beim Bearbeiten) ───────── */}
      {isEdit && event?.id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-muted-foreground" />
              Kostenpositionen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {costsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Laden...
              </div>
            ) : (
              <>
                {/* Existing cost rows */}
                {costs.length > 0 ? (
                  <div className="space-y-2">
                    {costs.map((cost) =>
                      editingCostId === cost.id ? (
                        <div key={cost.id} className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                          <Input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            placeholder="Beschreibung"
                            autoFocus
                          />
                          <div className="relative w-32 shrink-0">
                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="pl-7 h-8 text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => saveEditCost(cost.id)}>
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingCostId(null)}>
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          key={cost.id}
                          className="flex gap-2 items-center border rounded-lg px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                          onClick={() => startEditCost(cost)}
                          title="Klicken zum Bearbeiten"
                        >
                          <span className="flex-1 text-sm text-gray-800">{cost.description}</span>
                          <span className="text-sm font-medium text-gray-700 shrink-0">
                            {formatEuro(cost.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); handleDeleteCost(cost.id); }}
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    )}
                    <div className="flex justify-between items-center px-3 pt-1 border-t">
                      <span className="text-sm font-semibold text-gray-700">Gesamtkosten</span>
                      <span className="text-base font-bold text-gray-900">{formatEuro(totalCosts)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-1">
                    Noch keine Kostenpositionen. Füge Positionen wie Hallenmiete, Schiedsrichter oder Material hinzu.
                  </p>
                )}

                {/* Add new cost row */}
                <div className="flex gap-2 items-end pt-2 border-t">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Neue Position</Label>
                    <Input
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder='z.B. "Hallenmiete", "Schiedsrichter"'
                      className="h-9 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCost(); } }}
                    />
                  </div>
                  <div className="w-32 shrink-0 space-y-1">
                    <Label className="text-xs">Betrag (€)</Label>
                    <div className="relative">
                      <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        value={newAmount}
                        onChange={(e) => setNewAmount(e.target.value)}
                        placeholder="0,00"
                        className="pl-7 h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCost(); } }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={handleAddCost}
                    disabled={addingCost || !newDesc.trim() || !newAmount.trim()}
                  >
                    {addingCost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    <span className="ml-1 hidden sm:inline">Hinzufügen</span>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!isEdit && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800">
          <Euro className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            Kostenpositionen können nach dem Erstellen des Events hinzugefügt werden.
          </p>
        </div>
      )}

      {/* ── Bilder ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bilder</span>
            <Button type="button" variant="outline" size="sm" onClick={addImage}>
              <Plus className="w-4 h-4 mr-1" />
              Bild hinzufügen
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {images.length > 0 ? (
            <Reorder.Group axis="y" values={images} onReorder={setImages} className="space-y-3">
              {images.map((img) => (
                <Reorder.Item key={img._key} value={img} className="flex gap-2 items-start bg-gray-50 border rounded-lg p-3">
                  <div className="mt-2 cursor-grab active:cursor-grabbing text-gray-400 shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 relative">
                        <Input
                          value={img.url}
                          onChange={(e) => updateImage(img._key, "url", e.target.value)}
                          onBlur={(e) => validateImage(img._key, e.target.value)}
                          placeholder="https://beispiel.de/bild.jpg"
                          className={img.valid === false ? "border-red-400 pr-8" : img.valid === true ? "border-green-400 pr-8" : ""}
                        />
                        {img.valid === false && <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
                        {img.valid === true && <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeImage(img._key)}
                        className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      value={img.alt_text}
                      onChange={(e) => updateImage(img._key, "alt_text", e.target.value)}
                      placeholder="Bildbeschreibung (Alt-Text)"
                      className="text-sm"
                    />
                    {img.valid === true && img.url && (
                      <div className="mt-1 rounded overflow-hidden border bg-gray-100 h-28">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt_text || "Vorschau"} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {img.valid === false && (
                      <p className="text-xs text-red-600">Die URL konnte nicht als Bild geladen werden. Bitte prüfe die URL.</p>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <p className="text-sm text-muted-foreground">
              Noch keine Bilder hinzugefügt. Bilder werden im Karussell auf der Eventseite angezeigt.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Publish confirmation dialog */}
      <Dialog open={publishConfirmOpen} onOpenChange={(o) => { if (!o) setPublishConfirmOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event veröffentlichen</DialogTitle>
            <DialogDescription>
              Möchtest du dieses Event jetzt veröffentlichen? Es wird sofort für alle Besucher sichtbar und Anmeldungen sind möglich.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>
              Abbrechen
            </Button>
            <Button
              disabled={submitting}
              onClick={(e) => {
                setPublishConfirmOpen(false);
                handleSubmit(e as unknown as React.FormEvent, true);
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
              Veröffentlichen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
