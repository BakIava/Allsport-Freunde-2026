"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";
import type { EventTemplate, EventTemplateInput } from "@/lib/types";

interface TemplateFormProps {
  template?: EventTemplate;
}

export default function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!template;

  const [formData, setFormData] = useState<EventTemplateInput>({
    name: template?.name ?? "",
    title: template?.title ?? "",
    category: template?.category ?? "fussball",
    description: template?.description ?? "",
    location: template?.location ?? "",
    price: template?.price ?? "",
    dress_code: template?.dress_code ?? "",
    max_participants: template?.max_participants ?? 20,
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof EventTemplateInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/admin/templates/${template.id}` : "/api/admin/templates";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
