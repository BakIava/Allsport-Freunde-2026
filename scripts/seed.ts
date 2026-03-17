import "dotenv/config";
import { sql } from "@vercel/postgres";

const seedEvents = [
  {
    title: "Freundschaftskick im Park",
    category: "fussball",
    description: "Lockeres Fußballspiel für alle Altersgruppen. Kommt vorbei und kickt mit!",
    date: "2026-04-12",
    time: "15:00",
    location: "Sportpark am Main, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Fußballschuhe (Rasen)",
    max_participants: 20,
    registrations: 5,
    reg_prefix: "Spieler",
    reg_email_prefix: "spieler",
    reg_phone_prefix: "0155",
  },
  {
    title: "HIIT Outdoor Training",
    category: "fitness",
    description: "Hochintensives Intervalltraining an der frischen Luft. Für Anfänger und Fortgeschrittene.",
    date: "2026-04-05",
    time: "10:00",
    location: "Grüneburgpark, Frankfurt",
    price: "5 €",
    dress_code: "Sportkleidung & Laufschuhe",
    max_participants: 15,
    registrations: 8,
    reg_prefix: "Sportler",
    reg_email_prefix: "sportler",
    reg_phone_prefix: "0153",
  },
  {
    title: "Schwimmtraining für Anfänger",
    category: "schwimmen",
    description: "Grundlagen des Schwimmens lernen in entspannter Atmosphäre. Trainer vor Ort.",
    date: "2026-04-08",
    time: "18:00",
    location: "Hallenbad Höchst, Frankfurt",
    price: "Spende willkommen",
    dress_code: "Badebekleidung & Handtuch",
    max_participants: 12,
    registrations: 10,
    reg_prefix: "Teilnehmer",
    reg_email_prefix: "teilnehmer",
    reg_phone_prefix: "0151",
  },
  {
    title: "Fußball-Turnier: Rhein-Main Cup",
    category: "fussball",
    description: "Kleines Turnier mit gemischten Teams. Spaß und Fairplay stehen im Vordergrund!",
    date: "2026-04-19",
    time: "11:00",
    location: "Sportanlage Niederrad, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Hallenschuhe",
    max_participants: 24,
    registrations: 22,
    reg_prefix: "Kicker",
    reg_email_prefix: "kicker",
    reg_phone_prefix: "0154",
  },
  {
    title: "Yoga & Stretching am Morgen",
    category: "fitness",
    description: "Sanfter Start in den Tag mit Yoga und Dehnübungen für Körper und Geist.",
    date: "2026-04-15",
    time: "08:00",
    location: "Vereinsraum, Offenbach",
    price: "Kostenlos",
    dress_code: "Bequeme Kleidung & Yogamatte (falls vorhanden)",
    max_participants: 20,
    registrations: 0,
    reg_prefix: "",
    reg_email_prefix: "",
    reg_phone_prefix: "",
  },
  {
    title: "Aqua-Fitness Kurs",
    category: "schwimmen",
    description: "Gelenkschonendes Training im Wasser. Ideal für Einsteiger und Senioren.",
    date: "2026-04-22",
    time: "17:00",
    location: "Rebstockbad, Frankfurt",
    price: "8 €",
    dress_code: "Badebekleidung & Handtuch",
    max_participants: 16,
    registrations: 0,
    reg_prefix: "",
    reg_email_prefix: "",
    reg_phone_prefix: "",
  },
  {
    title: "Familien-Fußballfest",
    category: "fussball",
    description: "Ein Nachmittag für die ganze Familie! Kleine Spiele, Torwandschießen und mehr.",
    date: "2026-05-03",
    time: "14:00",
    location: "Sportpark Preungesheim, Frankfurt",
    price: "Kostenlos",
    dress_code: "Sportkleidung & Turnschuhe",
    max_participants: 30,
    registrations: 0,
    reg_prefix: "",
    reg_email_prefix: "",
    reg_phone_prefix: "",
  },
  {
    title: "Kraulschwimmen Technik-Workshop",
    category: "schwimmen",
    description: "Verbessere deine Kraultechnik mit unserem erfahrenen Trainer. Grundkenntnisse erforderlich.",
    date: "2026-04-29",
    time: "19:00",
    location: "Stadionbad, Frankfurt",
    price: "10 €",
    dress_code: "Badebekleidung, Schwimmbrille & Handtuch",
    max_participants: 10,
    registrations: 10,
    reg_prefix: "Schwimmer",
    reg_email_prefix: "schwimmer",
    reg_phone_prefix: "0152",
  },
];

async function seed() {
  console.log("Füge Seed-Daten ein...\n");

  for (const event of seedEvents) {
    const { rows } = await sql`
      INSERT INTO events (title, category, description, date, time, location, price, dress_code, max_participants)
      VALUES (${event.title}, ${event.category}, ${event.description}, ${event.date}, ${event.time}, ${event.location}, ${event.price}, ${event.dress_code}, ${event.max_participants})
      RETURNING id
    `;
    const eventId = (rows[0] as { id: number }).id;
    console.log(`  ✓ Event erstellt: ${event.title} (ID: ${eventId})`);

    for (let i = 1; i <= event.registrations; i++) {
      const token = `seed-token-${eventId}-${i}`;
      await sql`
        INSERT INTO registrations (event_id, first_name, last_name, email, phone, guests, status, status_token)
        VALUES (${eventId}, ${event.reg_prefix}, ${String(i)}, ${`${event.reg_email_prefix}${i}@beispiel.de`}, ${`${event.reg_phone_prefix}${String(i).padStart(8, "0")}`}, ${0}, ${"approved"}, ${token})
      `;
    }

    if (event.registrations > 0) {
      console.log(`    + ${event.registrations} Anmeldungen hinzugefügt`);
    }
  }

  console.log("\nSeed-Daten erfolgreich eingefügt!");
}

seed().catch((err) => {
  console.error("Fehler beim Seeden:", err);
  process.exit(1);
});
