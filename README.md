# Allsport Freunde 2026 e.V.

Moderner Onepager für den gemeinnützigen Sportverein **Allsport Freunde 2026 e.V.** in der Rhein-Main-Region.

## Tech-Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (manuell integriert)
- **Vercel Postgres** (@vercel/postgres)
- **Framer Motion** für Animationen
- **Lucide React** für Icons

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Die App läuft dann unter [http://localhost:3000](http://localhost:3000).

**Ohne Datenbank:** Wenn keine `POSTGRES_URL` gesetzt ist, verwendet die App automatisch In-Memory-Daten mit Beispiel-Events. So kannst du lokal ohne Datenbank-Setup entwickeln.

**Mit Datenbank:** Wenn du lokal mit einer echten Postgres-DB arbeiten möchtest, erstelle eine `.env.local` mit den Postgres-Zugangsdaten (siehe `.env.example`).

## Deployment auf Vercel

1. **Code auf GitHub pushen**

2. **Vercel-Projekt erstellen:** Auf [vercel.com](https://vercel.com) → „Add New Project" → dein GitHub-Repo auswählen

3. **Postgres-Datenbank erstellen:** Im Vercel-Dashboard → Storage → „Create Database" → Postgres wählen → mit dem Projekt verbinden

4. **Env-Variablen lokal ziehen:**
   ```bash
   npx vercel env pull .env.local
   ```

5. **Tabellen erstellen:**
   ```bash
   npx tsx scripts/setup-db.ts
   ```

6. **Seed-Daten einfügen:**
   ```bash
   npx tsx scripts/seed.ts
   ```

7. **Deployen:** `git push` – Vercel baut automatisch

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
  db.ts                        # Datenbank-Abstraktionsschicht
  local-data.ts                # In-Memory-Fallback für lokale Entwicklung
  types.ts                     # TypeScript Typen
  utils.ts                     # Hilfsfunktionen
/scripts
  setup-db.ts                  # Erstellt Tabellen in Vercel Postgres
  seed.ts                      # Fügt Beispiel-Events ein
```
