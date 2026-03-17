import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "allsport.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeDatabase(db);
  return db;
}

function initializeDatabase(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('fussball', 'fitness', 'schwimmen')),
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT NOT NULL,
      price TEXT NOT NULL,
      dress_code TEXT NOT NULL,
      max_participants INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      guests INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id),
      UNIQUE(event_id, email)
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as count FROM events").get() as { count: number };
  if (count.count === 0) {
    seedDatabase(db);
  }
}

function seedDatabase(db: Database.Database) {
  const insertEvent = db.prepare(`
    INSERT INTO events (title, category, description, date, time, location, price, dress_code, max_participants)
    VALUES (@title, @category, @description, @date, @time, @location, @price, @dress_code, @max_participants)
  `);

  const insertRegistration = db.prepare(`
    INSERT INTO registrations (event_id, first_name, last_name, email, phone, guests)
    VALUES (@event_id, @first_name, @last_name, @email, @phone, @guests)
  `);

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
    },
  ];

  const transaction = db.transaction(() => {
    for (const event of seedEvents) {
      const result = insertEvent.run(event);
      const eventId = result.lastInsertRowid as number;

      // Add some sample registrations to make it realistic
      if (event.title === "Schwimmtraining für Anfänger") {
        // Almost full (10 of 12)
        for (let i = 1; i <= 10; i++) {
          insertRegistration.run({
            event_id: eventId,
            first_name: `Teilnehmer`,
            last_name: `${i}`,
            email: `teilnehmer${i}@beispiel.de`,
            phone: `0151${String(i).padStart(8, "0")}`,
            guests: 0,
          });
        }
      } else if (event.title === "Kraulschwimmen Technik-Workshop") {
        // Completely booked (10 of 10)
        for (let i = 1; i <= 10; i++) {
          insertRegistration.run({
            event_id: eventId,
            first_name: `Schwimmer`,
            last_name: `${i}`,
            email: `schwimmer${i}@beispiel.de`,
            phone: `0152${String(i).padStart(8, "0")}`,
            guests: 0,
          });
        }
      } else if (event.title === "HIIT Outdoor Training") {
        // Half full (8 of 15)
        for (let i = 1; i <= 8; i++) {
          insertRegistration.run({
            event_id: eventId,
            first_name: `Sportler`,
            last_name: `${i}`,
            email: `sportler${i}@beispiel.de`,
            phone: `0153${String(i).padStart(8, "0")}`,
            guests: 0,
          });
        }
      } else if (event.title === "Fußball-Turnier: Rhein-Main Cup") {
        // Almost full (22 of 24)
        for (let i = 1; i <= 22; i++) {
          insertRegistration.run({
            event_id: eventId,
            first_name: `Kicker`,
            last_name: `${i}`,
            email: `kicker${i}@beispiel.de`,
            phone: `0154${String(i).padStart(8, "0")}`,
            guests: 0,
          });
        }
      } else if (event.title === "Freundschaftskick im Park") {
        // Some registrations (5 of 20)
        for (let i = 1; i <= 5; i++) {
          insertRegistration.run({
            event_id: eventId,
            first_name: `Spieler`,
            last_name: `${i}`,
            email: `spieler${i}@beispiel.de`,
            phone: `0155${String(i).padStart(8, "0")}`,
            guests: 0,
          });
        }
      }
    }
  });

  transaction();
}
