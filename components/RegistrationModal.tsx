"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventWithRegistrations } from "@/lib/types";
import { CheckCircle2, Loader2 } from "lucide-react";

interface RegistrationModalProps {
  event: EventWithRegistrations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function RegistrationModal({
  event,
  open,
  onOpenChange,
  onSuccess,
}: RegistrationModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    guests: 0,
    accepted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      guests: 0,
      accepted: false,
    });
    setError(null);
    setSuccess(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    if (!formData.accepted) {
      setError("Bitte akzeptiere die Teilnahmebedingungen.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          guests: formData.guests,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ein Fehler ist aufgetreten.");
        return;
      }

      setSuccess(true);
      onSuccess();
    } catch {
      setError("Verbindungsfehler. Bitte versuche es erneut.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mx-4">
        {success ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Anmeldung erfolgreich!
            </h3>
            <p className="text-gray-600 mb-1">
              Du bist jetzt angemeldet für:
            </p>
            <p className="font-semibold text-gray-900 mb-4">{event.title}</p>
            <div className="text-sm text-gray-500 space-y-1 mb-6">
              <p>
                {new Date(event.date + "T00:00:00").toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                um {event.time} Uhr
              </p>
              <p>{event.location}</p>
              {formData.guests > 0 && (
                <p>+ {formData.guests} Begleitperson{formData.guests > 1 ? "en" : ""}</p>
              )}
            </div>
            <Button onClick={() => handleClose(false)} className="rounded-full">
              Schließen
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Anmeldung: {event.title}</DialogTitle>
              <DialogDescription>
                Fülle das Formular aus, um dich für dieses Event anzumelden.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    required
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    placeholder="Max"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    required
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="max@beispiel.de"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefonnummer (WhatsApp) *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="0151 12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guests">Wie viele Leute nimmst du mit?</Label>
                <Input
                  id="guests"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.guests}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      guests: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="accepted"
                  checked={formData.accepted}
                  onChange={(e) =>
                    setFormData({ ...formData, accepted: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                />
                <Label htmlFor="accepted" className="text-sm text-gray-600 cursor-pointer">
                  Ich akzeptiere die Teilnahmebedingungen und bin damit
                  einverstanden, dass meine Daten zur Organisation des Events
                  verwendet werden. *
                </Label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Wird gesendet...
                  </>
                ) : (
                  "Anmeldung absenden"
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
