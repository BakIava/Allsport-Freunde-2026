"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import type { ContactInquiryWithEvent, InquiryStatus } from "@/lib/types";

const statusConfig: Record<InquiryStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
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

  useEffect(() => { fetchInquiries(); }, []);

  const openCount = inquiries.filter((i) => i.status === "open").length;

  return (
    <div className="p-6 max-w-8xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kontaktanfragen</h1>
            {openCount > 0 && (
              <p className="text-sm text-orange-600 font-medium">
                {openCount} offene {openCount === 1 ? "Anfrage" : "Anfragen"}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInquiries}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
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
          <Button variant="outline" onClick={fetchInquiries}>Erneut versuchen</Button>
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Noch keine Kontaktanfragen eingegangen.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">E-Mail</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Veranstaltung</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Eingang</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const name = [inq.first_name, inq.last_name].filter(Boolean).join(" ") || "–";
                  const sc = statusConfig[inq.status];
                  return (
                    <tr
                      key={inq.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{inq.email}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-[180px] truncate">
                        {inq.event_title ?? <span className="italic text-gray-400">Keine</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell whitespace-nowrap">
                        {formatDateTime(inq.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/contact/${inq.id}`}>
                          <Button size="sm" variant="outline">
                            Öffnen
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
