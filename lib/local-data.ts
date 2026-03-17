import { hashSync } from "bcryptjs";
import type {
  EventWithRegistrations,
  Registration,
  AdminUser,
  AdminStats,
  EventCreateInput,
  RegistrationWithEvent,
} from "./types";

const seedEvents: EventWithRegistrations[] = [
  {
    id: 1,
    title: "Freundschaftskick im Park",
    category: "fussball",
    description: "Lockeres Fußballspiel für alle Altersgruppen. Kommt vorbei und kickt mit!",
    date: "2026-04-12",
    time: "15:00",
    location: "Sportpark am Main, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Fußballschuhe (Rasen)",
    max_participants: 20,
    created_at: new Date().toISOString(),
    current_participants: 5,
  },
  {
    id: 2,
    title: "HIIT Outdoor Training",
    category: "fitness",
    description: "Hochintensives Intervalltraining an der frischen Luft. Für Anfänger und Fortgeschrittene.",
    date: "2026-04-05",
    time: "10:00",
    location: "Grüneburgpark, Frankfurt",
    price: "5 €",
    dress_code: "Sportkleidung & Laufschuhe",
    max_participants: 15,
    created_at: new Date().toISOString(),
    current_participants: 8,
  },
  {
    id: 3,
    title: "Schwimmtraining für Anfänger",
    category: "schwimmen",
    description: "Grundlagen des Schwimmens lernen in entspannter Atmosphäre. Trainer vor Ort.",
    date: "2026-04-08",
    time: "18:00",
    location: "Hallenbad Höchst, Frankfurt",
    price: "Spende willkommen",
    dress_code: "Badebekleidung & Handtuch",
    max_participants: 12,
    created_at: new Date().toISOString(),
    current_participants: 10,
  },
  {
    id: 4,
    title: "Fußball-Turnier: Rhein-Main Cup",
    category: "fussball",
    description: "Kleines Turnier mit gemischten Teams. Spaß und Fairplay stehen im Vordergrund!",
    date: "2026-04-19",
    time: "11:00",
    location: "Sportanlage Niederrad, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Hallenschuhe",
    max_participants: 24,
    created_at: new Date().toISOString(),
    current_participants: 22,
  },
  {
    id: 5,
    title: "Yoga & Stretching am Morgen",
    category: "fitness",
    description: "Sanfter Start in den Tag mit Yoga und Dehnübungen für Körper und Geist.",
    date: "2026-04-15",
    time: "08:00",
    location: "Vereinsraum, Offenbach",
    price: "Kostenlos",
    dress_code: "Bequeme Kleidung & Yogamatte (falls vorhanden)",
    max_participants: 20,
    created_at: new Date().toISOString(),
    current_participants: 0,
  },
  {
    id: 6,
    title: "Aqua-Fitness Kurs",
    category: "schwimmen",
    description: "Gelenkschonendes Training im Wasser. Ideal für Einsteiger und Senioren.",
    date: "2026-04-22",
    time: "17:00",
    location: "Rebstockbad, Frankfurt",
    price: "8 €",
    dress_code: "Badebekleidung & Handtuch",
    max_participants: 16,
    created_at: new Date().toISOString(),
    current_participants: 0,
  },
  {
    id: 7,
    title: "Familien-Fußballfest",
    category: "fussball",
    description: "Ein Nachmittag für die ganze Familie! Kleine Spiele, Torwandschießen und mehr.",
    date: "2026-05-03",
    time: "14:00",
    location: "Sportpark Preungesheim, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Turnschuhe",
    max_participants: 30,
    created_at: new Date().toISOString(),
    current_participants: 0,
  },
  {
    id: 8,
    title: "Kraulschwimmen Technik-Workshop",
    category: "schwimmen",
    description: "Verbessere deine Kraultechnik mit unserem erfahrenen Trainer. Grundkenntnisse erforderlich.",
    date: "2026-04-29",
    time: "19:00",
    location: "Stadionbad, Frankfurt",
    price: "10 €",
    dress_code: "Badebekleidung, Schwimmbrille & Handtuch",
    max_participants: 10,
    created_at: new Date().toISOString(),
    current_participants: 10,
  },
];

// In-memory stores
let localEvents = [...seedEvents];
let localRegistrations: Registration[] = [];
let nextRegistrationId = 1;
let nextEventId = 9;

// Pre-populate some registrations to match current_participants
function initSeedRegistrations() {
  const mapping: { eventId: number; count: number; prefix: string; emailPrefix: string }[] = [
    { eventId: 1, count: 5, prefix: "Spieler", emailPrefix: "spieler" },
    { eventId: 2, count: 8, prefix: "Sportler", emailPrefix: "sportler" },
    { eventId: 3, count: 10, prefix: "Teilnehmer", emailPrefix: "teilnehmer" },
    { eventId: 4, count: 22, prefix: "Kicker", emailPrefix: "kicker" },
    { eventId: 8, count: 10, prefix: "Schwimmer", emailPrefix: "schwimmer" },
  ];
  for (const m of mapping) {
    for (let i = 1; i <= m.count; i++) {
      localRegistrations.push({
        id: nextRegistrationId++,
        event_id: m.eventId,
        first_name: m.prefix,
        last_name: String(i),
        email: `${m.emailPrefix}${i}@beispiel.de`,
        phone: `0151${String(i).padStart(8, "0")}`,
        guests: 0,
        created_at: new Date().toISOString(),
      });
    }
  }
}
initSeedRegistrations();

// Admin user (password: "admin")
const adminPasswordHash = hashSync(
  process.env.ADMIN_PASSWORD || "admin",
  10
);
const localAdminUser: AdminUser = {
  id: 1,
  username: process.env.ADMIN_USERNAME || "admin",
  password_hash: adminPasswordHash,
  created_at: new Date().toISOString(),
};

// ─── Public ──────────────────────────────────────────────

export function getLocalEvents(): EventWithRegistrations[] {
  return localEvents
    .filter((e) => e.date >= new Date().toISOString().split("T")[0])
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

export function getLocalEvent(id: number) {
  return localEvents.find((e) => e.id === id);
}

export function getLocalRegistrationCount(eventId: number): number {
  const event = localEvents.find((e) => e.id === eventId);
  return event?.current_participants ?? 0;
}

export function findLocalRegistration(eventId: number, email: string) {
  return localRegistrations.find(
    (r) => r.event_id === eventId && r.email === email
  );
}

export function createLocalRegistration(data: {
  event_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  guests: number;
}): Registration {
  const registration: Registration = {
    id: nextRegistrationId++,
    ...data,
    created_at: new Date().toISOString(),
  };
  localRegistrations.push(registration);

  const event = localEvents.find((e) => e.id === data.event_id);
  if (event) {
    event.current_participants += 1 + data.guests;
  }

  return registration;
}

// ─── Auth ────────────────────────────────────────────────

export function getLocalAdminUser(username: string): AdminUser | null {
  if (username === localAdminUser.username) return localAdminUser;
  return null;
}

// ─── Admin: Stats ────────────────────────────────────────

export function getLocalAdminStats(): AdminStats {
  const today = new Date().toISOString().split("T")[0];
  const upcoming = localEvents.filter((e) => e.date >= today);
  const totalRegs = localEvents.reduce((sum, e) => sum + e.current_participants, 0);
  const totalMax = upcoming.reduce((sum, e) => sum + e.max_participants, 0);
  const avgUtil = totalMax === 0 ? 0 : Math.round((upcoming.reduce((sum, e) => sum + e.current_participants, 0) / totalMax) * 100);

  return {
    total_events: localEvents.length,
    upcoming_events: upcoming.length,
    total_registrations: totalRegs,
    avg_utilization: avgUtil,
  };
}

// ─── Admin: Events ───────────────────────────────────────

export function getLocalAllEvents(): EventWithRegistrations[] {
  return [...localEvents].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
}

export function getLocalEventFull(id: number): EventWithRegistrations | null {
  return localEvents.find((e) => e.id === id) ?? null;
}

export function createLocalEvent(data: EventCreateInput): { id: number } {
  const id = nextEventId++;
  localEvents.push({
    id,
    ...data,
    created_at: new Date().toISOString(),
    current_participants: 0,
  });
  return { id };
}

export function updateLocalEvent(id: number, data: EventCreateInput): void {
  const event = localEvents.find((e) => e.id === id);
  if (event) {
    Object.assign(event, data);
  }
}

export function deleteLocalEvent(id: number): void {
  localRegistrations = localRegistrations.filter((r) => r.event_id !== id);
  localEvents = localEvents.filter((e) => e.id !== id);
}

// ─── Admin: Registrations ────────────────────────────────

export function getLocalAllRegistrations(): RegistrationWithEvent[] {
  return localRegistrations
    .map((r) => {
      const event = localEvents.find((e) => e.id === r.event_id);
      return {
        ...r,
        event_title: event?.title ?? "Unbekannt",
        event_date: event?.date ?? "",
        event_category: event?.category ?? "",
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalEventRegistrations(eventId: number): RegistrationWithEvent[] {
  const event = localEvents.find((e) => e.id === eventId);
  return localRegistrations
    .filter((r) => r.event_id === eventId)
    .map((r) => ({
      ...r,
      event_title: event?.title ?? "Unbekannt",
      event_date: event?.date ?? "",
      event_category: event?.category ?? "",
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function deleteLocalRegistration(id: number): void {
  const reg = localRegistrations.find((r) => r.id === id);
  if (reg) {
    const event = localEvents.find((e) => e.id === reg.event_id);
    if (event) {
      event.current_participants = Math.max(0, event.current_participants - 1 - reg.guests);
    }
    localRegistrations = localRegistrations.filter((r) => r.id !== id);
  }
}
