"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import HelferForm from "@/components/admin/HelferForm";
import type { Helper } from "@/lib/types";

export default function EditHelferPage() {
  const { id } = useParams<{ id: string }>();
  const [helper, setHelper] = useState<Helper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/helfer/${id}`);
        if (!res.ok) throw new Error();
        setHelper(await res.json());
      } catch {
        setError("Helfer konnte nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !helper) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-red-600">{error ?? "Helfer nicht gefunden."}</p>
        <Link href="/admin/helfer">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Link
        href={`/admin/helfer/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück zu {helper.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Helfer bearbeiten</h1>
        <p className="text-muted-foreground mt-1">{helper.name}</p>
      </div>

      <HelferForm initial={helper} />
    </div>
  );
}
