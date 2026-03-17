import type { EventWithRegistrations, Registration } from "./types";

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

// In-memory store for local development without a database
let localEvents = [...seedEvents];
let localRegistrations: Registration[] = [];
let nextRegistrationId = 1;

export function getLocalEvents(): EventWithRegistrations[] {
  return localEvents.filter((e) => e.date >= new Date().toISOString().split("T")[0]);
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

  // Update participant count on the event
  const event = localEvents.find((e) => e.id === data.event_id);
  if (event) {
    event.current_participants += 1 + data.guests;
  }

  return registration;
}
