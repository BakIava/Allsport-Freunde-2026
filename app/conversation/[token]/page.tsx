"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  User,
  Shield,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import type { ContactInquiryDetail, InquiryStatus } from "@/lib/types";

const statusConfig: Record<InquiryStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  open: { label: "Offen", variant: "default" },
  answered: { label: "Beantwortet", variant: "secondary" },
  resolved: { label: "Gelöst", variant: "outline" },
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

export default function ConversationPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [inquiry, setInquiry] = useState<Omit<ContactInquiryDetail, "whatsapp_number"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchInquiry = async () => {
    try {
      const res = await fetch(`/api/conversation/${token}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Anfrage nicht gefunden.");
        return;
      }
      const data = await res.json();
      setInquiry(data);
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInquiry();
  }, [token]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (inquiry?.messages?.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [inquiry?.messages?.length]);

  const handleSend = async () => {
    if (!replyText.trim() || !token) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/conversation/${token}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error || "Fehler beim Senden.");
        return;
      }
      setReplyText("");
      fetchInquiry();
    } catch {
      setSendError("Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !inquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Anfrage nicht gefunden</h1>
          <p className="text-gray-500 text-sm">
            {error ?? "Dieser Link ist möglicherweise abgelaufen oder ungültig."}
          </p>
          <a href="/" className="mt-6 inline-block text-sm text-green-700 underline underline-offset-2">
            Zur Startseite
          </a>
        </div>
      </div>
    );
  }

  const sc = statusConfig[inquiry.status];
  const name = [inquiry.first_name, inquiry.last_name].filter(Boolean).join(" ") || "Deine Anfrage";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-green-100">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Allsport Freunde 2026</p>
              <p className="text-xs text-gray-500">{name}</p>
            </div>
          </div>
          <Badge variant={sc.variant}>{sc.label}</Badge>
        </div>
      </div>

      {/* Conversation */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-32">
        {/* Event reference */}
        {inquiry.event_title && (
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
              Betreffend: <strong>{inquiry.event_title}</strong>
            </span>
          </div>
        )}

        {/* Messages */}
        {inquiry.messages.map((msg) => {
          const isAdmin = msg.sender === "admin";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isAdmin ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                  isAdmin ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                }`}
              >
                {isAdmin ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                  isAdmin
                    ? "bg-green-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
                }`}
              >
                {isAdmin && (
                  <p className="text-xs text-green-200 font-medium mb-1">Allsport Team</p>
                )}
                <p>{msg.message}</p>
                <p className={`text-xs mt-1.5 ${isAdmin ? "text-green-200" : "text-gray-400"}`}>
                  {formatDateTime(msg.sent_at)}
                </p>
              </div>
            </div>
          );
        })}

        {/* Resolved notice */}
        {inquiry.status === "resolved" && (
          <div className="flex items-center gap-2 justify-center text-sm text-gray-500 py-4">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Diese Anfrage wurde als gelöst markiert.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply box – fixed at bottom */}
      {inquiry.status !== "resolved" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
            {sendError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {sendError}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Antwort schreiben…"
                rows={2}
                className="resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
              />
              <Button
                onClick={handleSend}
                disabled={sending || !replyText.trim()}
                size="icon"
                className="self-end h-10 w-10 shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400">Enter + Strg/Cmd zum Senden</p>
          </div>
        </div>
      )}
    </div>
  );
}
