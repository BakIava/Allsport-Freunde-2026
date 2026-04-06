import { hashSync } from "bcryptjs";
import type {
  EventWithRegistrations,
  Registration,
  AdminUser,
  AdminStats,
  EventCreateInput,
  RegistrationWithEvent,
  RegistrationStatusInfo,
  RegistrationStatus,
} from "./types";

const seedEvents: EventWithRegistrations[] = [
  { id: 1, title: "Freundschaftskick im Park", category: "fussball", description: "Lockeres Fußballspiel für alle Altersgruppen. Kommt vorbei und kickt mit!", date: "2026-04-12", time: "15:00", location: "Sportpark am Main, Frankfurt", price: "Kostenlos", dress_code: "Sportkleidung & Fußballschuhe (Rasen)", max_participants: 20, created_at: new Date().toISOString(), current_participants: 5, pending_participants: 0 },
  { id: 2, title: "HIIT Outdoor Training", category: "fitness", description: "Hochintensives Intervalltraining an der frischen Luft. Für Anfänger und Fortgeschrittene.", date: "2026-04-05", time: "10:00", location: "Grüneburgpark, Frankfurt", price: "5 €", dress_code: "Sportkleidung & Laufschuhe", max_participants: 15, created_at: new Date().toISOString(), current_participants: 8, pending_participants: 0 },
  { id: 3, title: "Schwimmtraining für Anfänger", category: "schwimmen", description: "Grundlagen des Schwimmens lernen in entspannter Atmosphäre. Trainer vor Ort.", date: "2026-04-08", time: "18:00", location: "Hallenbad Höchst, Frankfurt", price: "Spende willkommen", dress_code: "Badebekleidung & Handtuch", max_participants: 12, created_at: new Date().toISOString(), current_participants: 10, pending_participants: 0 },
  { id: 4, title: "Fußball-Turnier: Rhein-Main Cup", category: "fussball", description: "Kleines Turnier mit gemischten Teams. Spaß und Fairplay stehen im Vordergrund!", date: "2026-04-19", time: "11:00", location: "Sportanlage Niederrad, Frankfurt", price: "Kostenlos", dress_code: "Sportkleidung & Hallenschuhe", max_participants: 24, created_at: new Date().toISOString(), current_participants: 22, pending_participants: 0 },
  { id: 5, title: "Yoga & Stretching am Morgen", category: "fitness", description: "Sanfter Start in den Tag mit Yoga und Dehnübungen für Körper und Geist.", date: "2026-04-15", time: "08:00", location: "Vereinsraum, Offenbach", price: "Kostenlos", dress_code: "Bequeme Kleidung & Yogamatte (falls vorhanden)", max_participants: 20, created_at: new Date().toISOString(), current_participants: 0, pending_participants: 2 },
  { id: 6, title: "Aqua-Fitness Kurs", category: "schwimmen", description: "Gelenkschonendes Training im Wasser. Ideal für Einsteiger und Senioren.", date: "2026-04-22", time: "17:00", location: "Rebstockbad, Frankfurt", price: "8 €", dress_code: "Badebekleidung & Handtuch", max_participants: 16, created_at: new Date().toISOString(), current_participants: 0, pending_participants: 0 },
  { id: 7, title: "Familien-Fußballfest", category: "fussball", description: "Ein Nachmittag für die ganze Familie! Kleine Spiele, Torwandschießen und mehr.", date: "2026-05-03", time: "14:00", location: "Sportpark Preungesheim, Frankfurt", price: "Kostenlos", dress_code: "Sportkleidung & Turnschuhe", max_participants: 30, created_at: new Date().toISOString(), current_participants: 0, pending_participants: 0 },
  { id: 8, title: "Kraulschwimmen Technik-Workshop", category: "schwimmen", description: "Verbessere deine Kraultechnik mit unserem erfahrenen Trainer. Grundkenntnisse erforderlich.", date: "2026-04-29", time: "19:00", location: "Stadionbad, Frankfurt", price: "10 €", dress_code: "Badebekleidung, Schwimmbrille & Handtuch", max_participants: 10, created_at: new Date().toISOString(), current_participants: 10, pending_participants: 0 },
];

let localEvents = [...seedEvents];
let localRegistrations: Registration[] = [];
let nextRegistrationId = 1;
let nextEventId = 9;

function initSeedRegistrations() {
  const mapping: { eventId: number; count: number; prefix: string; emailPrefix: string; status: RegistrationStatus }[] = [
    { eventId: 1, count: 5, prefix: "Spieler", emailPrefix: "spieler", status: "approved" },
    { eventId: 2, count: 8, prefix: "Sportler", emailPrefix: "sportler", status: "approved" },
    { eventId: 3, count: 10, prefix: "Teilnehmer", emailPrefix: "teilnehmer", status: "approved" },
    { eventId: 4, count: 22, prefix: "Kicker", emailPrefix: "kicker", status: "approved" },
    { eventId: 5, count: 2, prefix: "Yogi", emailPrefix: "yogi", status: "pending" },
    { eventId: 8, count: 10, prefix: "Schwimmer", emailPrefix: "schwimmer", status: "approved" },
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
        status: m.status,
        status_token: crypto.randomUUID(),
        status_changed_at: m.status === "approved" ? new Date().toISOString() : null,
        status_note: null,
        created_at: new Date().toISOString(),
      });
    }
  }
}
initSeedRegistrations();

const adminPasswordHash = hashSync(process.env.ADMIN_PASSWORD || "admin", 10);
const localAdminUser: AdminUser = {
  id: 1,
  username: process.env.ADMIN_USERNAME || "admin",
  password_hash: adminPasswordHash,
  created_at: new Date().toISOString(),
};

// Helper to recompute event participant counts
function recomputeParticipants(eventId: number) {
  const event = localEvents.find((e) => e.id === eventId);
  if (!event) return;
  event.current_participants = localRegistrations
    .filter((r) => r.event_id === eventId && r.status === "approved")
    .reduce((sum, r) => sum + 1 + r.guests, 0);
  event.pending_participants = localRegistrations
    .filter((r) => r.event_id === eventId && r.status === "pending")
    .reduce((sum, r) => sum + 1 + r.guests, 0);
}

function toRegistrationWithEvent(r: Registration): RegistrationWithEvent {
  const event = localEvents.find((e) => e.id === r.event_id);
  return {
    ...r,
    event_title: event?.title ?? "Unbekannt",
    event_date: event?.date ?? "",
    event_category: event?.category ?? "",
  };
}

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
  return localRegistrations
    .filter((r) => r.event_id === eventId && r.status === "approved")
    .reduce((sum, r) => sum + 1 + r.guests, 0);
}

export function findLocalRegistration(eventId: number, email: string) {
  return localRegistrations.find((r) => r.event_id === eventId && r.email === email);
}

export function createLocalRegistration(data: {
  event_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  guests: number;
  status_token: string;
}): Registration {
  const registration: Registration = {
    id: nextRegistrationId++,
    ...data,
    status: "pending",
    status_changed_at: null,
    status_note: null,
    created_at: new Date().toISOString(),
  };
  localRegistrations.push(registration);
  recomputeParticipants(data.event_id);
  return registration;
}

// ─── Status Page ─────────────────────────────────────────

export function getLocalRegistrationByToken(token: string): RegistrationStatusInfo | null {
  const reg = localRegistrations.find((r) => r.status_token === token);
  if (!reg) return null;
  const event = localEvents.find((e) => e.id === reg.event_id);
  if (!event) return null;
  return {
    id: reg.id,
    first_name: reg.first_name,
    last_name: reg.last_name,
    email: reg.email,
    guests: reg.guests,
    status: reg.status,
    status_note: reg.status_note,
    status_changed_at: reg.status_changed_at,
    created_at: reg.created_at,
    event_title: event.title,
    event_date: event.date,
    event_time: event.time,
    event_location: event.location,
    event_category: event.category,
    event_price: event.price,
    event_dress_code: event.dress_code,
  };
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
  const totalRegs = localRegistrations.reduce((sum, r) => sum + 1 + r.guests, 0);
  const pendingRegs = localRegistrations.filter((r) => r.status === "pending").reduce((sum, r) => sum + 1 + r.guests, 0);
  const approvedUpcoming = upcoming.reduce((sum, e) => sum + (e.current_participants ?? 0), 0);
  const totalMax = upcoming.reduce((sum, e) => sum + e.max_participants, 0);
  const avgUtil = totalMax === 0 ? 0 : Math.round((approvedUpcoming / totalMax) * 100);

  return {
    total_events: localEvents.length,
    upcoming_events: upcoming.length,
    total_registrations: totalRegs,
    pending_registrations: pendingRegs,
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
  localEvents.push({ id, ...data, created_at: new Date().toISOString(), current_participants: 0, pending_participants: 0 });
  return { id };
}

export function updateLocalEvent(id: number, data: EventCreateInput): void {
  const event = localEvents.find((e) => e.id === id);
  if (event) Object.assign(event, data);
}

export function deleteLocalEvent(id: number): void {
  localRegistrations = localRegistrations.filter((r) => r.event_id !== id);
  localEvents = localEvents.filter((e) => e.id !== id);
}

// ─── Admin: Registrations ────────────────────────────────

export function getLocalAllRegistrations(): RegistrationWithEvent[] {
  return localRegistrations
    .map(toRegistrationWithEvent)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalEventRegistrations(eventId: number): RegistrationWithEvent[] {
  return localRegistrations
    .filter((r) => r.event_id === eventId)
    .map(toRegistrationWithEvent)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function deleteLocalRegistration(id: number): void {
  const reg = localRegistrations.find((r) => r.id === id);
  if (reg) {
    localRegistrations = localRegistrations.filter((r) => r.id !== id);
    recomputeParticipants(reg.event_id);
  }
}

// ─── Admin: Status Changes ──────────────────────────────

export function updateLocalRegistrationStatus(id: number, status: RegistrationStatus, note?: string): RegistrationWithEvent | null {
  const reg = localRegistrations.find((r) => r.id === id);
  if (!reg) return null;
  reg.status = status;
  reg.status_changed_at = new Date().toISOString();
  reg.status_note = note || null;
  recomputeParticipants(reg.event_id);
  return toRegistrationWithEvent(reg);
}

export function getLocalRegistrationWithEvent(id: number): RegistrationWithEvent | null {
  const reg = localRegistrations.find((r) => r.id === id);
  if (!reg) return null;
  return toRegistrationWithEvent(reg);
}

export function bulkUpdateLocalRegistrationStatus(ids: number[], status: RegistrationStatus, note?: string): RegistrationWithEvent[] {
  const results: RegistrationWithEvent[] = [];
  for (const id of ids) {
    const result = updateLocalRegistrationStatus(id, status, note);
    if (result) results.push(result);
  }
  return results;
}
