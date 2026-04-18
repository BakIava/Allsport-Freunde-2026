"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Send,
  User,
  Shield,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import type { ContactInquiryDetail, InquiryStatus } from "@/lib/types";

const statusConfig: Record<
  InquiryStatus,
  { label: string; variant: "default" | "secondary" | "outline"; next: InquiryStatus | null; nextLabel: string }
> = {
  open: { label: "Offen", variant: "default", next: "resolved", nextLabel: "Als gelöst markieren" },
  answered: { label: "Beantwortet", variant: "secondary", next: "resolved", nextLabel: "Als gelöst markieren" },
  resolved: { label: "Gelöst", variant: "outline", next: "open", nextLabel: "Wieder öffnen" },
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text: string, maxLength = 25) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export default function AdminContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const inquiryId = params?.id;

  const [inquiry, setInquiry] = useState<ContactInquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchInquiry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contact/${inquiryId}`);
      if (res.status === 404) { router.push("/admin/contact"); return; }
      if (!res.ok) throw new Error("Fehler beim Laden");
      setInquiry(await res.json());
    } catch {
      setError("Anfrage konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (inquiryId) fetchInquiry(); }, [inquiryId]);

  const handleSend = async () => {
    if (!responseText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/admin/contact/${inquiryId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseText: responseText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error || "Fehler beim Senden.");
        return;
      }
      setResponseText("");
      fetchInquiry();
    } catch {
      setSendError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: InquiryStatus) => {
    setStatusUpdating(true);
    try {
      await fetch(`/api/admin/contact/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchInquiry();
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error ?? "Anfrage nicht gefunden."}</p>
        <Link href="/admin/contact">
          <Button variant="outline">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  const sc = statusConfig[inquiry.status];
  const name = [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" ") || "Unbekannt";

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/contact"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 break-words">Anfrage von {name}</h1>
              <p className="text-sm text-gray-500">{formatDateTime(inquiry.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={sc.variant}>{sc.label}</Badge>
            {sc.next && (
              <Button
                size="sm"
                variant="outline"
                disabled={statusUpdating}
                onClick={() => handleStatusChange(sc.next!)}
              >
                {statusUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : sc.nextLabel}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">
          Kontaktdaten
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Name" value={name} />
          <InfoRow icon={<Mail className="w-4 h-4 text-gray-400" />} label="E-Mail" value={inquiry.email} />
          {inquiry.whatsapp_number && (
            <InfoRow
              icon={<Phone className="w-4 h-4 text-gray-400" />}
              label="WhatsApp"
              value={inquiry.whatsapp_number}
            />
          )}
          {inquiry.event_title && (
            <InfoRow
              icon={<Calendar className="w-4 h-4 text-gray-400" />}
              label="Veranstaltung"
              value={inquiry.event_title}
            />
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Konversation</h2>
        </div>
        <div className="p-5 space-y-4">
          {inquiry.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "admin" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                  msg.sender === "admin"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {msg.sender === "admin" ? (
                  <Shield className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === "admin"
                    ? "bg-green-600 text-white rounded-tr-sm"
                    : "bg-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                <p className="wrap-break-word">{msg.message}</p>
                <p
                  className={`text-xs mt-1.5 ${
                    msg.sender === "admin" ? "text-green-200" : "text-gray-400"
                  }`}
                >
                  {formatDateTime(msg.sent_at)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply box */}
        {inquiry.status !== "resolved" && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
            {sendError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                {sendError}
              </div>
            )}
            <Textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Antwort schreiben…"
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSend}
                disabled={sending || !responseText.trim()}
                className="w-full sm:w-auto"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Antwort senden
              </Button>
            </div>
          </div>
        )}

        {inquiry.status === "resolved" && (
          <div className="px-5 pb-5 pt-4 text-center text-sm text-gray-400 border-t border-gray-100">
            Diese Anfrage wurde als gelöst markiert.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-gray-800 break-all">{value}</p>
      </div>
    </div>
  );
}
