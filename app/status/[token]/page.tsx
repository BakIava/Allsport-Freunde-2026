"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import StatusPage from "@/components/status/StatusPage";
import { Loader2 } from "lucide-react";
import type { RegistrationStatusInfo } from "@/lib/types";

export default function StatusPageRoute() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const justCancelled = searchParams.get("cancelled") === "true";
  const [info, setInfo] = useState<RegistrationStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/status/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setInfo)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Anmeldung nicht gefunden</h1>
          <p className="text-gray-500">Der Link ist ungültig oder die Anmeldung existiert nicht mehr.</p>
        </div>
      </div>
    );
  }

  return <StatusPage info={info} justCancelled={justCancelled} />;
}
