"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Loader2, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2, Euro } from "lucide-react";
import { Reorder } from "framer-motion";
import type { EventTemplate, EventTemplateInput, EventImageInput } from "@/lib/types";

interface TemplateFormProps {
  template?: EventTemplate;
}

interface ImageEntry {
  _key: string;
  url: string;
  alt_text: string;
  valid: boolean | null;
}

interface CostEntry {
  _key: string;
  description: string;
  amount: string;
}

function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) { resolve(false); return; }
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 5000);
  });
}

export default function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!template;

  const [formData, setFormData] = useState<Omit<EventTemplateInput, "images" | "template_costs">>({
    name: template?.name ?? "",
    title: template?.title ?? "",
    category: template?.category ?? "fussball",
    description: template?.description ?? "",
    location: template?.location ?? "",
    price: template?.price ?? "",
    entry_price: template?.entry_price ?? null,
    dress_code: template?.dress_code ?? "",
    max_participants: template?.max_participants ?? 20,
  });

  const [costs, setCosts] = useState<CostEntry[]>(() =>
    (template?.template_costs ?? []).map((c) => ({
      _key: crypto.randomUUID(),
      description: c.description,
      amount: String(c.amount),
    }))
  );

  const [images, setImages] = useState<ImageEntry[]>(() =>
    (template?.images ?? []).map((img, i) => ({
      _key: String(i),
      url: img.url,
      alt_text: img.alt_text,
      valid: true,
    }))
  );

  const [submitting, setSubmitting] = useState(false);

  const addImage = () => setImages((prev) => [...prev, { _key: crypto.randomUUID(), url: "", alt_text: "", valid: null }]);
  const removeImage = (key: string) => setImages((prev) => prev.filter((i) => i._key !== key));
  const updateImage = (key: string, field: "url" | "alt_text", value: string) =>
    setImages((prev) => prev.map((i) => (i._key === key ? { ...i, [field]: value, valid: field === "url" ? null : i.valid } : i)));

  const validateImage = useCallback(async (key: string, url: string) => {
    if (!url.trim()) { setImages((prev) => prev.map((i) => (i._key === key ? { ...i, valid: null } : i))); return; }
    const ok = await validateImageUrl(url);
    setImages((prev) => prev.map((i) => (i._key === key ? { ...i, valid: ok } : i)));
  }, []);

  const update = (field: keyof Omit<EventTemplateInput, "images" | "template_costs">, value: string | number | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addCost = () => setCosts((prev) => [...prev, { _key: crypto.randomUUID(), description: "", amount: "" }]);
  const removeCost = (key: string) => setCosts((prev) => prev.filter((c) => c._key !== key));
  const updateCost = (key: string, field: "description" | "amount", value: string) =>
    setCosts((prev) => prev.map((c) => (c._key === key ? { ...c, [field]: value } : c)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/templates/${template.id}` : "/api/admin/templates";
      const method = isEdit ? "PUT" : "POST";
      const imagePayload: EventImageInput[] = images
        .filter((i) => i.url.trim())
        .map((i, idx) => ({ url: i.url.trim(), alt_text: i.alt_text.trim(), position: idx }));
      const costsPayload = costs
        .filter((c) => c.description.trim() && c.amount.trim())
        .map((c) => ({
          description: c.description.trim(),
          amount: parseFloat(c.amount.replace(",", ".")),
        }))
        .filter((c) => c.amount > 0);
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, images: imagePayload, template_costs: costsPayload }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Fehler beim Speichern.", "error");
        return;
      }
      toast(isEdit ? "Vorlage aktualisiert!" : "Vorlage erstellt!", "success");
      router.push("/admin/templates");
      router.refresh();
    } catch {
      toast("Verbindungsfehler.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Vorlage bearbeiten" : "Neue Vorlage erstellen"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template meta */}
          <div className="space-y-2">
            <Label htmlFor="name">Vorlagenname * <span className="text-muted-foreground font-normal">(interner Name)</span></Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder='z.B. "Monatliches Vereinstraining", "Sommerfest Standard"'
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Standard-Eventtitel *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="z.B. Fußball-Vereinstraining"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategorie *</Label>
              <Select
                id="category"
                required
                value={formData.category}
                onChange={(e) => update("category", e.target.value as EventTemplateInput["category"])}
              >
                <option value="fussball">Fußball</option>
                <option value="fitness">Fitness</option>
                <option value="schwimmen">Schwimmen</option>
              </Select>
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
              <Label htmlFor="entry_price">
                Eintrittspreis (€)
                <span className="text-muted-foreground font-normal ml-1 text-xs">(für Umsatzberechnung, optional)</span>
              </Label>
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
              <p className="text-xs text-muted-foreground">Wird beim Anlegen eines Events aus dieser Vorlage übernommen.</p>
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
              placeholder="Standard-Beschreibung für diesen Veranstaltungstyp..."
              rows={4}
            />
          </div>

          {/* Cost positions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Standard-Kostenpositionen</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Werden beim Erstellen eines Events aus dieser Vorlage automatisch angelegt.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCost}>
                <Plus className="w-4 h-4 mr-1" />
                Position hinzufügen
              </Button>
            </div>

            {costs.length > 0 ? (
              <div className="space-y-2">
                {costs.map((cost) => (
                  <div key={cost._key} className="flex gap-2 items-center bg-gray-50 border rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <Input
                        value={cost.description}
                        onChange={(e) => updateCost(cost._key, "description", e.target.value)}
                        placeholder="Beschreibung (z.B. Hallenmiete)"
                        className="mb-2"
                      />
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost.amount}
                          onChange={(e) => updateCost(cost._key, "amount", e.target.value)}
                          placeholder="0,00"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCost(cost._key)}
                      className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Gesamt: {costs
                    .filter((c) => c.amount.trim())
                    .reduce((s, c) => s + (parseFloat(c.amount.replace(",", ".")) || 0), 0)
                    .toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Noch keine Kostenpositionen. Diese werden beim Anlegen eines Events aus der Vorlage als Standard-Kostenpositionen übernommen.
              </p>
            )}
          </div>

          {/* Image management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Bilder</Label>
              <Button type="button" variant="outline" size="sm" onClick={addImage}>
                <Plus className="w-4 h-4 mr-1" />
                Bild hinzufügen
              </Button>
            </div>

            {images.length > 0 && (
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(img._key)} className="shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50">
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
                      {img.valid === false && <p className="text-xs text-red-600">Die URL konnte nicht als Bild geladen werden.</p>}
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            )}

            {images.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Noch keine Bilder hinzugefügt. Diese Bilder werden beim Erstellen eines Events aus dieser Vorlage vorausgefüllt.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? "Änderungen speichern" : "Vorlage erstellen"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
