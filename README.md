# Allsport Freunde 2026 e.V.

Moderner Onepager für den gemeinnützigen Sportverein **Allsport Freunde 2026 e.V.** in der Rhein-Main-Region.

## Tech-Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (manuell integriert)
- **Vercel Postgres** (@vercel/postgres)
- **Framer Motion** für Animationen
- **NextAuth.js v5** (Auth.js) für Authentifizierung
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

8. **Cron-Job aktivieren (Erinnerungsmails):**
   - Erzeuge ein sicheres Secret: `openssl rand -base64 32`
   - Vercel-Dashboard → Project Settings → Environment Variables → `CRON_SECRET` setzen
   - Der Job läuft täglich um 08:00 UTC (09:00 MEZ / 10:00 MESZ) und sendet Erinnerungsmails an alle bestätigten Teilnehmer, deren Event am nächsten Tag stattfindet
   - Logs: Vercel-Dashboard → Logs → Cron

## Admin-Bereich

Der Admin-Bereich ist unter `/admin` erreichbar und durch Login geschützt.

**Standard-Login:** `admin` / `admin`

Funktionen:
- **Dashboard** mit Statistiken und letzten Anmeldungen
- **Event-Verwaltung** – Erstellen, Bearbeiten, Löschen mit Filter und Suche
- **Anmeldungs-Verwaltung** – Übersicht, Filterung, CSV-Export, Löschen
- Responsive Sidebar-Navigation

Die Admin-Credentials können über Environment Variables überschrieben werden (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).

## Features

- Responsiver Onepager mit Hero, Über uns, Events, FAQ und Footer
- Event-Anmeldung mit Formular-Validierung
- Kategorie-Filter (Fußball, Fitness, Schwimmen)
- Plätze-Fortschrittsbalken mit Ausgebucht-Status
- Duplikat-Prüfung bei Anmeldungen
- Smooth Scrolling und dezente Scroll-Animationen
- Komplett auf Deutsch
- Admin-Bereich mit Login, Dashboard, Event- und Anmeldungsverwaltung

## API-Endpunkte

### Öffentlich
- `GET /api/events` – Alle kommenden Events mit Teilnehmerzahlen
- `POST /api/registrations` – Neue Anmeldung erstellen

### Cron (Bearer CRON_SECRET)
- `GET /api/cron/send-reminders` – Erinnerungsmails versenden (täglich 08:00 UTC via Vercel Cron)

### Admin (geschützt)
- `GET /api/admin/stats` – Dashboard-Statistiken
- `GET/POST /api/admin/events` – Events auflisten / erstellen
- `GET/PUT/DELETE /api/admin/events/[id]` – Event lesen / bearbeiten / löschen
- `GET /api/admin/events/[id]/registrations` – Anmeldungen pro Event
- `GET /api/admin/registrations` – Alle Anmeldungen
- `DELETE /api/admin/registrations/[id]` – Anmeldung löschen
- `GET /api/admin/registrations/export` – CSV-Export

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
/app
  /admin
    layout.tsx                   # Admin-Layout mit Sidebar
    page.tsx                     # Dashboard
    /login/page.tsx              # Login-Seite
    /events/page.tsx             # Event-Übersicht
    /events/new/page.tsx         # Neues Event
    /events/[id]/edit/page.tsx   # Event bearbeiten
    /events/[id]/registrations/  # Anmeldungen pro Event
    /registrations/page.tsx      # Alle Anmeldungen
  /api/admin/                    # Geschützte Admin-API-Routes
/components/admin
  Sidebar.tsx                    # Sidebar-Navigation
  StatsCards.tsx                 # Dashboard-Statistiken
  EventForm.tsx                  # Event-Formular
  EventTable.tsx                 # Event-Tabelle mit Filter
  RegistrationTable.tsx          # Anmeldungs-Tabelle
  RecentRegistrations.tsx        # Letzte Anmeldungen
/lib
  auth.ts                        # NextAuth-Konfiguration
  db.ts                          # Datenbank-Abstraktionsschicht
  local-data.ts                  # In-Memory-Fallback für lokale Entwicklung
  types.ts                       # TypeScript Typen
  utils.ts                       # Hilfsfunktionen
/scripts
  setup-db.ts                    # Erstellt Tabellen + Admin-User
  seed.ts                        # Fügt Beispiel-Events ein
```
