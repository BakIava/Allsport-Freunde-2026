# Allsport Freunde 2026 e.V.

Moderner Onepager für den gemeinnützigen Sportverein **Allsport Freunde 2026 e.V.** in der Rhein-Main-Region.

## Tech-Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (manuell integriert)
- **SQLite** via better-sqlite3
- **Framer Motion** für Animationen
- **Lucide React** für Icons

## Setup

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die App läuft dann unter [http://localhost:3000](http://localhost:3000).

Die SQLite-Datenbank wird beim ersten Start automatisch im Ordner `data/` erstellt und mit Beispiel-Events befüllt.

## Features

- Responsiver Onepager mit Hero, Über uns, Events, FAQ und Footer
- Event-Anmeldung mit Formular-Validierung
- Kategorie-Filter (Fußball, Fitness, Schwimmen)
- Plätze-Fortschrittsbalken mit Ausgebucht-Status
- Duplikat-Prüfung bei Anmeldungen
- Smooth Scrolling und dezente Scroll-Animationen
- Komplett auf Deutsch

## API-Endpunkte

- `GET /api/events` – Alle kommenden Events mit Teilnehmerzahlen
- `POST /api/registrations` – Neue Anmeldung erstellen

## Projektstruktur

```
/app
  /api/events/route.ts        # Events API
  /api/registrations/route.ts  # Anmeldungen API
  layout.tsx                   # Root Layout
  page.tsx                     # Hauptseite
  globals.css                  # Globale Styles
/components
  /ui/                         # shadcn/ui Komponenten
  Hero.tsx                     # Hero-Bereich
  AboutUs.tsx                  # Über uns Sektion
  EventCard.tsx                # Event-Karte
  EventGrid.tsx                # Event-Grid mit Filter
  RegistrationModal.tsx        # Anmelde-Dialog
  GeneralInfo.tsx              # FAQ-Bereich
  Footer.tsx                   # Footer mit Kontakt
/lib
  db.ts                        # Datenbank + Seed
  types.ts                     # TypeScript Typen
  utils.ts                     # Hilfsfunktionen
```
