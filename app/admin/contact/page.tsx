"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import type { ContactInquiryWithEvent, InquiryStatus } from "@/lib/types";

const statusConfig: Record<
  InquiryStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  open: { label: "Offen", variant: "default" },
  answered: { label: "Beantwortet", variant: "secondary" },
  resolved: { label: "Gelöst", variant: "outline" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminContactPage() {
  const [inquiries, setInquiries] = useState<ContactInquiryWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/contact");
      if (!res.ok) throw new Error("Fehler beim Laden");
      setInquiries(await res.json());
    } catch {
      setError("Anfragen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const openCount = inquiries.filter((i) => i.status === "open").length;

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-green-600 shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Kontaktanfragen
            </h1>
            {openCount > 0 && (
              <p className="text-sm text-orange-600 font-medium">
                {openCount} offene{" "}
                {openCount === 1 ? "Anfrage" : "Anfragen"}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInquiries}>
          <RefreshCw className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Aktualisieren</span>
          <span className="sm:hidden">↺</span>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchInquiries}>
            Erneut versuchen
          </Button>
        </div>
      ) : (
        <ResponsiveTable
          columns={[
            {
              key: "first_name",
              label: "Name",
              render: (inq) => {
                const name = [inq.first_name, inq.last_name].filter(Boolean).join(" ") || "–";
                return (
                  <span className="font-medium text-gray-900 truncate block" title={name}>
                    {name.length > 40 ? `${name.slice(0, 40)}...` : name}
                  </span>
                );
              },
            },
            {
              key: "email",
              label: "E-Mail",
              render: (inq) => {
                const email = inq.email as string;
                return (
                  <span className="truncate block" title={email}>
                    {email.length > 40 ? `${email.slice(0, 40)}...` : email}
                  </span>
                );
              },
            },
            {
              key: "event_title",
              label: "Veranstaltung",
              hideOnMobile: true,
              render: (inq) =>
                inq.event_title ?? (
                  <span className="italic text-gray-400">Keine</span>
                ),
            },
            {
              key: "status",
              label: "Status",
              render: (inq) => {
                const sc = statusConfig[inq.status as InquiryStatus];
                return sc ? (
                  <Badge variant={sc.variant}>{sc.label}</Badge>
                ) : null;
              },
            },
            {
              key: "created_at",
              label: "Eingang",
              hideOnMobile: true,
              render: (inq) => (
                <span className="whitespace-nowrap text-gray-500">
                  {formatDateTime(inq.created_at as string)}
                </span>
              ),
            },
          ]}
          data={inquiries}
          keyField="id"
          tableWrapperClassName="rounded-xl border border-gray-200 bg-white"
          emptyMessage="Noch keine Kontaktanfragen eingegangen."
          actions={(inq) => (
            <Link href={`/admin/contact/${inq.id}`}>
              <Button size="sm" variant="outline">
                Öffnen
              </Button>
            </Link>
          )}
          actionLayout="stack"
        />
      )}
    </div>
  );
}
