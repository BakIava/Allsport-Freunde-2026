"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import RegistrationDetailModal from "@/components/RegistrationDetailModal";
import type { RegistrationDetail } from "@/lib/types";

interface Props {
  registrationId: number;
}

export default function RegistrationDetailButton({ registrationId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RegistrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    if (data) return; // already fetched
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Fehler beim Laden der Anmeldung.");
      } else {
        setData(body as RegistrationDetail);
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Details anzeigen"
        onClick={handleOpen}
        type="button"
      >
        <Eye className="w-4 h-4 text-blue-500" />
      </Button>
      <RegistrationDetailModal
        open={open}
        onClose={() => setOpen(false)}
        loading={loading}
        data={data}
        error={error}
      />
    </>
  );
}
