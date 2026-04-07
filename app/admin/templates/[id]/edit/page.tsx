"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TemplateForm from "@/components/admin/TemplateForm";
import type { EventTemplate } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function EditTemplatePage() {
  const params = useParams();
  const [template, setTemplate] = useState<EventTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/templates/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Vorlage nicht gefunden");
        return r.json();
      })
      .then(setTemplate)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600">{error || "Vorlage nicht gefunden."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vorlage bearbeiten</h1>
        <p className="text-muted-foreground mt-1">{template.name}</p>
      </div>
      <TemplateForm template={template} />
    </div>
  );
}
