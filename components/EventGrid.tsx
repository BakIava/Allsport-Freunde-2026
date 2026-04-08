"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import EventCard from "./EventCard";
import RegistrationModal from "./RegistrationModal";
import EventDetailModal from "./EventDetailModal";
import ContactFormModal from "./ContactFormModal";
import type { EventWithRegistrations } from "@/lib/types";
import { motion } from "framer-motion";
import { Loader2, MessageSquare } from "lucide-react";

const categories = [
  { key: "alle", label: "Alle" },
  { key: "fussball", label: "Fußball ⚽" },
  { key: "fitness", label: "Fitness 💪" },
  { key: "schwimmen", label: "Schwimmen 🏊" },
];

export default function EventGrid() {
  const [events, setEvents] = useState<EventWithRegistrations[]>([]);
  const [filter, setFilter] = useState("alle");

  // Registration modal state
  const [selectedEvent, setSelectedEvent] = useState<EventWithRegistrations | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Detail modal state
  const [detailEvent, setDetailEvent] = useState<EventWithRegistrations | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Contact modal state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactEventId, setContactEventId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error("Fehler beim Laden");
      const data = await res.json();
      setEvents(data);
      setError(null);
    } catch {
      setError("Events konnten nicht geladen werden. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents =
    filter === "alle"
      ? events
      : events.filter((e) => e.category === filter);

  const handleRegister = (event: EventWithRegistrations) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleShowDetails = (event: EventWithRegistrations) => {
    setDetailEvent(event);
    setDetailOpen(true);
  };

  const handleRegistrationSuccess = () => {
    fetchEvents();
  };

  const handleContact = (eventId?: number) => {
    setContactEventId(eventId ?? null);
    setContactOpen(true);
  };

  return (
    <section id="events" className="py-20 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kommende Events
          </h2>
          <div className="w-16 h-1 bg-green-500 mx-auto mb-8 rounded-full" />
          <p className="text-gray-600 max-w-2xl mx-auto">
            Melde dich für unsere nächsten Veranstaltungen an. Die Plätze sind begrenzt!
          </p>
        </motion.div>

        {/* Filter buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap justify-center gap-2 mb-10"
        >
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={filter === cat.key ? "default" : "outline"}
              onClick={() => setFilter(cat.key)}
              className="rounded-full"
            >
              {cat.label}
            </Button>
          ))}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchEvents} variant="outline">
              Erneut versuchen
            </Button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">
              Keine Events in dieser Kategorie gefunden.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onRegister={handleRegister}
                onShowDetails={handleShowDetails}
              />
            ))}
          </div>
        )}

        <RegistrationModal
          event={selectedEvent}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onSuccess={handleRegistrationSuccess}
        />

        <EventDetailModal
          event={detailEvent}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          onRegister={handleRegister}
          onContact={handleContact}
        />

        <ContactFormModal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          eventId={contactEventId}
          events={events}
        />
      </div>

      {/* Contact button */}
      <div className="mt-12 text-center">
        <Button
          type="button"
          variant="outline"
          className="h-12 px-6 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-400 hover:text-green-800 transition-colors"
          onClick={() => handleContact()}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Fragen oder Anmerkungen? Kontaktiere uns!
        </Button>
      </div>
    </section>
  );
}
