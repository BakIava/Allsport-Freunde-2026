# Refactoring-Report: Codebase-Struktur & Bereinigung

Stand der Analyse: 2026-07-06 · Branch: `claude/codebase-refactor-cleanup-v6plve`

---

## 0. Wichtiger Hinweis: Auftrag ↔ Codebase (Mapping)

Der Auftragstext beschreibt die App **„Zack Zack Rechnung"** (Next.js 15, next-intl unter
`/[locale]/`, Supabase als Datenzugriff, Entitäten Document/Customer/Service/Company,
Dokumenten-Flow unter `flow/` + `create/`, RPCs `finalize_document`, `complete_onboarding`,
`get_next_document_number`).

Dieses Repository ist jedoch **„Allsport Freunde 2026"** — eine Vereins-/Event-App:

| Auftrag (Zack Zack Rechnung) | Realität in diesem Repo (Allsport Freunde 2026) |
|---|---|
| Next.js 15 App Router | Next.js 16 App Router (`next@^16.1.7`), TypeScript strict ✓ |
| next-intl unter `/[locale]/` | Kein next-intl, keine Locale-Routen — App ist einsprachig Deutsch |
| Supabase als Daten-Backend | **Neon Postgres** (`@neondatabase/serverless`, raw SQL). Supabase (`@supabase/ssr`) wird **nur für Admin-Auth** genutzt |
| Entitäten: Document, Customer, Service, Company | Entitäten: **Event, Registration (+ Persons), Checkin, Finance (Costs/Donations), Template, Inquiry (Kontakt), Helper** |
| Flow auf `flow/` + `create/` verteilt | Existiert nicht — kein `flow/`, kein `create/` |
| RPCs `finalize_document` etc. | Existieren nicht — keine Postgres-RPCs im App-Code |
| Ziel-Layout `src/...` | Repo nutzt Root-Layout (`app/`, `components/`, `lib/` auf Top-Level, `@/* → ./*`) |

**Konsequenz:** Die fünf Problemkategorien werden **sinngemäß auf die reale Codebase
angewendet**. Punkte, deren Gegenstand hier nicht existiert, sind pro Kapitel als
**N/A** ausgewiesen. Nicht übertragbare Detailvorgaben (z. B. `src/`-Präfix,
`flow/`→`create/`-Konsolidierung, Supabase-generierte DB-Typen) werden begründet
dokumentiert statt künstlich erzwungen.

---

## 1. Doppelte Type-/Interface-Definitionen

### Ist-Zustand

Es gibt bereits **einen zentralen Ort**: `lib/types.ts` (445 Zeilen, **alle** Entitäten in
einer einzigen Datei). Eine 10-fache Duplikation wie im Auftragstext existiert nicht —
wohl aber echte Duplikate und Entitäts-Typen am falschen Ort:

### Echte Duplikate (werden entfernt)

1. **Personen-Namenspaar `{ firstName, lastName }`** — 6 Definitionen/Inline-Formen:
   - `components/RegistrationModal.tsx:21` — `interface Person`
   - `app/events/[eventId]/walk-in/WalkInForm.tsx:25` — `interface Person`
   - `app/admin/events/[id]/dashboard/page.tsx:41` — `interface WalkInPerson`
   - `lib/types.ts:150` — inline in `RegistrationRequest.persons: Array<{ firstName; lastName }>`
   - `lib/email.ts:40` — inline in `EmailData.persons`
   - `lib/db/checkins.ts:298` — inline im Parameter von `createWalkInRegistration`
   - → **Neu:** zentraler Typ `PersonName` in `lib/types/registration.ts`

2. **Check-in-Event-Zeile** — 2 Definitionen:
   - `lib/db/checkins.ts:5` — `interface CheckinEventRow` (Quelle)
   - `app/admin/checkin/page.tsx:19` — `interface CheckinEvent` (Feld-für-Feld-Kopie)
   - plus `app/admin/checkin/page.tsx:35` — `interface CheckinEventsResponse` dupliziert den
     anonymen Rückgabetyp von `getCheckinEvents()` (`{ today, upcoming, past }`)
   - → **Neu:** `CheckinEventRow` + `CheckinEventsOverview` in `lib/types/checkin.ts`

3. **QR-Lookup-Ergebnis** — 2 Definitionen:
   - `lib/db/checkins.ts:143` — anonymer Rückgabetyp von `getRegistrationWithPersonsByQRToken`
   - `app/admin/events/[id]/scanner/page.tsx:26` — `interface ScanPreview` (gleiche Felder + `token`)
   - → **Neu:** `CheckinLookupRegistration` in `lib/types/checkin.ts`; Scanner nutzt
     `CheckinLookupRegistration & { token: string }`

4. **Kategorie-Union `"fussball" | "fitness" | "schwimmen"`** — 4× inline in `lib/types.ts`
   (`Event.category:6`, `EventTemplate.category:276`, `EventTemplateInput.category:293`,
   `EventCreateInput.category:306`)
   - → **Neu:** `EventCategory` in `lib/types/event.ts`

### Entitäts-/DTO-Typen außerhalb des zentralen Orts (werden verschoben)

- `lib/db/checkins.ts:5` — `CheckinEventRow` → `lib/types/checkin.ts`
- `lib/db/registrations.ts:464` — `CancellationTokenInfo` → `lib/types/registration.ts`
- `lib/db/registrations.ts:544` — `RegistrationDueForReminder` → `lib/types/registration.ts`
- `lib/db/registrations.ts:647` — `RegistrationDueForSurvey` → `lib/types/registration.ts`

### Bewusst lokal belassen (kein Duplikat, komponentenspezifisch)

- Props-Interfaces aller Komponenten (`EventCardProps`, `interface Props` in `emails/*` usw.)
- UI-/Formular-State: `FormState` (WalkInForm), `DonationForm`/`QRData`/`Tab` (Dashboard),
  `ScanError`/`OfflineScan` (Scanner), `PreviewData`/`TokenStatus` (cancel-registration),
  `FinanceRow`/`Period`/`SortKey` (Finanzen), `ImageEntry`/`CostEntry`/`LocalCost`
  (EventForm/TemplateForm), `CheckinEvent`-Filtertypen (EventTable), `Toast` (toast.tsx)
- Infrastruktur: `CacheEntry` (lib/cache.ts), `RateLimitOptions` (lib/ratelimit.ts),
  `HoneypotInput` (lib/honeypot.ts), `EmailData` (lib/email.ts, modulprivater DTO),
  JWT-Payloads `CheckinTokenPayload`/`WalkInTokenPayload` (lib/checkin.ts — Vertrag des
  Token-Moduls, kein Entitätstyp)
- `lib/local-data.ts`: `LocalReg`, `TemplateImage` — interne Row-Typen des In-Memory-Dev-Fallbacks

### N/A aus dem Auftrag

- **„Abgeleitet aus Supabase-generierten DB-Typen":** Der Datenzugriff läuft über Neon
  (raw SQL) — es gibt keine generierten Datenbanktypen und keine Supabase-Tabellen im
  App-Code. Typgenerierung einzuführen hieße neues Tooling/Dependency → laut Auftrag verboten.
  Single Source of Truth bleiben die handgepflegten Entitätstypen, künftig modular unter
  `lib/types/`.

### Zielstruktur

```
lib/types/
├── index.ts          # Re-Export (alle bisherigen `@/lib/types`-Imports bleiben gültig)
├── common.ts         # PersonName, AdminStats
├── event.ts          # EventCategory, EventStatus, Event, EventImage(-Input),
│                     # EventWithRegistrations, toPublicEvent, EventCreateInput,
│                     # PublishEventResult, CancelEventResult
├── registration.ts   # RegistrationStatus, Registration(-Person), RegistrationRequest,
│                     # WalkInInput, RegistrationWithEvent/-Detail/-StatusInfo, EventPerson,
│                     # CancellationToken(-Info), RegistrationDueForReminder/-Survey
├── checkin.ts        # CheckinParticipant, CheckinStatusResponse, CheckinEventRow,
│                     # CheckinEventsOverview, CheckinLookupRegistration
├── finance.ts        # EventCost, EventDonation, EventFinancials
├── template.ts       # TemplateCost(-Input), EventTemplate(-Input)
├── inquiry.ts        # InquiryStatus, MessageSender, ContactInquiry(+With…/Detail),
│                     # InquiryMessage, ContactFormInput
└── helper.ts         # HelperQualification (+Labels), Helper, HelperInput
```

Hinweis: `toPublicEvent()` (reiner Mapper auf `EventWithRegistrations`) zieht mit nach
`lib/types/event.ts`, damit alle bestehenden `import { toPublicEvent } from "@/lib/types"`
unverändert funktionieren.

---

## 2. Datenzugriff vereinheitlichen (Repository-Pattern)

### Ist-Zustand — besser als befürchtet

Eine Repository-Schicht **existiert bereits**: `lib/db/` mit einem Modul pro Entität —
`events.ts` (295 Z.), `registrations.ts` (722 Z.), `checkins.ts` (367 Z.), `finances.ts`
(201 Z.), `templates.ts` (112 Z.), `inquiries.ts` (138 Z.), `helpers.ts` (75 Z.),
`utils.ts` (Verbindung + Audit-Log). Dazu `lib/local-data.ts` als In-Memory-Fallback für
Entwicklung ohne DB. Client-Komponenten greifen **nie** direkt auf die DB zu, sondern
ausschließlich per `fetch` auf API-Routen; die API-Routen rufen Repository-Funktionen auf.

„Wild verstreute Supabase-Queries" gibt es hier nicht — Supabase wird ausschließlich für
Auth verwendet und ist bereits sauber nach dem `@supabase/ssr`-Muster getrennt:

- `lib/supabase/server.ts` (Server Components/Routen), `lib/supabase/client.ts` (Browser),
  `lib/supabase/middleware.ts` (Session-Refresh)
- Nutzer: `middleware.ts`, `app/login/*`, `app/auth/callback/route.ts`,
  `app/admin/layout.tsx`, `app/admin/actions/auth.ts` sowie die Auth-Guards der
  Admin-/Checkin-API-Routen. Kein einziges `supabase.from()` im Code.

### Verstöße (werden behoben)

1. **`app/api/registrations/route.ts:126–157`** — der **einzige** Inline-SQL-Block außerhalb
   von `lib/db/`: INSERT/UPDATE auf `registrations` + `registration_persons` inkl.
   Reaktivierung stornierter Anmeldungen (`import { getSQL } from "@/lib/db/utils"`).
   → **Neu:** `createPendingRegistration(...)` in `lib/db/registrations.ts`; die Route behält
   nur Request-Validierung, Rate-Limit, Honeypot und E-Mail-Versand.
2. **Doppelter Einstiegspunkt:** `lib/db.ts` (1 Zeile, Re-Export von `lib/db/index.ts`).
   → wird gelöscht; `@/lib/db` löst weiterhin über `lib/db/index.ts` auf. Danach importiert
   App-Code ausschließlich `@/lib/db` (nie Untermodule direkt).

### N/A aus dem Auftrag

- **RPC-Kapselung** (`finalize_document` etc.): keine RPCs vorhanden.
- **Client-Varianten der Repositories:** nicht nötig — Datenzugriff ist ausschließlich
  serverseitig (API-Routen/Cron); Clients konsumieren HTTP-Endpunkte.
- `scripts/` (Migrationen/Seeds) führen eigenes SQL aus — bewusst außerhalb der
  App-Repository-Schicht (Ops-Tooling), bleibt unverändert.

---

## 3. Ordnerstruktur konsolidieren

### Entscheidungen

- **Kein `src/`-Umzug:** Das Repo nutzt durchgängig Root-Layout (`@/* → ./*`). Die
  `src/`-Pfade im Auftrag beschreiben das andere Projekt. Ein Umzug wäre ein Diff über
  jede Datei ohne strukturellen Gewinn („keine Verbesserungen nebenbei").
- **`flow/` → `create/`:** N/A — beide Ordner existieren nicht.
- **`emails/`** bleibt eigenständig (React-Email-Templates, keine UI-Komponenten).
- **Routen/URLs bleiben unverändert** (nur Komponentendateien wandern).

### Verstöße (werden behoben)

- UI-Komponenten innerhalb von `app/`: `app/login/LoginForm.tsx`,
  `app/events/[eventId]/walk-in/WalkInForm.tsx`
- 14 Komponenten unsortiert auf Top-Level von `components/`
- Nicht-shadcn-Komponenten in `components/ui/`: `LastNameInput`, `MetricCard`,
  `MetricGrid`, `ResponsiveTable` (eigenentwickelte Widgets)
- `components/ui/toast.tsx` ist eigenentwickelt, bleibt aber als Design-System-Primitive
  in `ui/` (wird von 7 Modulen wie eine shadcn-Primitive konsumiert)

### Vorher → Nachher

**Vorher:**

```
app/
├── login/LoginForm.tsx                  ← Komponente in app/
└── events/[eventId]/walk-in/WalkInForm.tsx  ← Komponente in app/
components/
├── AboutUs.tsx            ├── Hero.tsx
├── ContactFormModal.tsx   ├── HoneypotFields.tsx
├── EventCard.tsx          ├── ImageCarousel.tsx
├── EventDetailModal.tsx   ├── LeafletMap.tsx
├── EventGrid.tsx          ├── RegistrationDetailButton.tsx
├── Footer.tsx             ├── RegistrationDetailModal.tsx
├── GeneralInfo.tsx        ├── RegistrationModal.tsx
├── admin/  (12 Dateien, PascalCase)
├── status/ (StatusBadge.tsx, StatusPage.tsx)
└── ui/     (shadcn kebab-case + LastNameInput.tsx, MetricCard.tsx,
             MetricGrid.tsx, ResponsiveTable.tsx)
```

**Nachher** (Dateinamen nach Schritt 4 zusätzlich kebab-case):

```
components/
├── admin/          # Backoffice (unverändert 12 Dateien)
├── auth/           # login-form
├── contact/        # contact-form-modal
├── events/         # event-grid, event-card, event-detail-modal, walk-in-form
├── home/           # hero, about-us, general-info
├── registrations/  # registration-modal, registration-detail-modal,
│                   # registration-detail-button
├── shared/         # footer, honeypot-fields, image-carousel, leaflet-map,
│                   # last-name-input, metric-card, metric-grid, responsive-table
├── status/         # status-badge, status-page (unverändert)
└── ui/             # NUR Primitives: accordion, badge, button, card, dialog,
                    # input, label, progress, select, table, textarea, toast
```

Business-Logik liegt bereits unter `lib/` (`finance.ts` Formatierung, `checkin.ts` JWT/QR,
`honeypot.ts`, `ratelimit.ts`, `cache.ts`, `email.ts`, `utils.ts`) — keine Änderung nötig.

---

## 4. Dateibenennung vereinheitlichen (kebab-case)

### Ist-Zustand

- ✓ bereits kebab-case/lowercase: alle Routen-Ordner unter `app/`, `emails/*`, `lib/*`,
  `scripts/*`, shadcn-Dateien in `components/ui/`
- ✗ **34 PascalCase-Dateien** (Komponenten)

### Umbenennungen (git mv, Exporte bleiben PascalCase)

| Vorher | Nachher (inkl. Ziel aus Schritt 3) |
|---|---|
| `components/AboutUs.tsx` | `components/home/about-us.tsx` |
| `components/Hero.tsx` | `components/home/hero.tsx` |
| `components/GeneralInfo.tsx` | `components/home/general-info.tsx` |
| `components/EventGrid.tsx` | `components/events/event-grid.tsx` |
| `components/EventCard.tsx` | `components/events/event-card.tsx` |
| `components/EventDetailModal.tsx` | `components/events/event-detail-modal.tsx` |
| `app/events/[eventId]/walk-in/WalkInForm.tsx` | `components/events/walk-in-form.tsx` |
| `components/RegistrationModal.tsx` | `components/registrations/registration-modal.tsx` |
| `components/RegistrationDetailModal.tsx` | `components/registrations/registration-detail-modal.tsx` |
| `components/RegistrationDetailButton.tsx` | `components/registrations/registration-detail-button.tsx` |
| `components/ContactFormModal.tsx` | `components/contact/contact-form-modal.tsx` |
| `app/login/LoginForm.tsx` | `components/auth/login-form.tsx` |
| `components/Footer.tsx` | `components/shared/footer.tsx` |
| `components/HoneypotFields.tsx` | `components/shared/honeypot-fields.tsx` |
| `components/ImageCarousel.tsx` | `components/shared/image-carousel.tsx` |
| `components/LeafletMap.tsx` | `components/shared/leaflet-map.tsx` |
| `components/ui/LastNameInput.tsx` | `components/shared/last-name-input.tsx` |
| `components/ui/MetricCard.tsx` | `components/shared/metric-card.tsx` |
| `components/ui/MetricGrid.tsx` | `components/shared/metric-grid.tsx` |
| `components/ui/ResponsiveTable.tsx` | `components/shared/responsive-table.tsx` |
| `components/admin/AdminMain.tsx` | `components/admin/admin-main.tsx` |
| `components/admin/AdminShell.tsx` | `components/admin/admin-shell.tsx` |
| `components/admin/EventForm.tsx` | `components/admin/event-form.tsx` |
| `components/admin/EventTable.tsx` | `components/admin/event-table.tsx` |
| `components/admin/HelferForm.tsx` | `components/admin/helfer-form.tsx` |
| `components/admin/PersonsTable.tsx` | `components/admin/persons-table.tsx` |
| `components/admin/RecentRegistrations.tsx` | `components/admin/recent-registrations.tsx` |
| `components/admin/RegistrationTable.tsx` | `components/admin/registration-table.tsx` |
| `components/admin/Sidebar.tsx` | `components/admin/sidebar.tsx` |
| `components/admin/StatsCards.tsx` | `components/admin/stats-cards.tsx` |
| `components/admin/TemplateForm.tsx` | `components/admin/template-form.tsx` |
| `components/admin/TemplateList.tsx` | `components/admin/template-list.tsx` |
| `components/status/StatusBadge.tsx` | `components/status/status-badge.tsx` |
| `components/status/StatusPage.tsx` | `components/status/status-page.tsx` |

Case-Sensitivity: Alle Umbenennungen per `git mv`; keine reinen Case-Only-Renames
(PascalCase→kebab-case ändert immer mehr als Groß-/Kleinschreibung), Linux/Vercel-sicher.
Betroffene Import-Stellen: ~90 (inkl. `next/dynamic`-Import von `LeafletMap` in
`EventDetailModal`).

---

## 5. Styling

### Befund: bereits konform

- **Einzige CSS-Datei:** `app/globals.css` (36 Zeilen) — enthält ausschließlich
  `@import "tailwindcss"`, `@theme`-Variablen (Farben/Font/Radius, Tailwind-v4-Config)
  und globale Basics (`html { scroll-behavior }`, `body`-Font/Farben). **Keine**
  komponentenspezifischen Styles, kein zentrales Custom-CSS-Bundle.
- Kein `*.module.css`, kein styled-jsx-Paket, keine weiteren CSS-Dateien.
- `components/LeafletMap.tsx:6` importiert `leaflet/dist/leaflet.css` (Library-CSS) —
  korrekt komponentenlokal.
- `app/admin/events/[id]/scanner/page.tsx:501–507` — ein Inline-`<style>` mit Overrides
  für das von **html5-qrcode** injizierte Fremd-DOM (`#qr-reader …`). Komponentenlokal
  und nur so umsetzbar (fremdes DOM, `!important` gegen Inline-Styles der Lib) → bleibt.

### Logische Properties (RTL)

Kein Style-Umzug nötig ⇒ die Auflage „beim Umzug nur ps-/pe-/ms-/me-" greift nicht.
Bestand: 117 physische Richtungs-Utilities (`pl-/pr-/ml-/mr-`) in 34 Dateien. Diese App
ist einsprachig Deutsch ohne next-intl/RTL-Anforderung; eine Massenumstellung wäre eine
„Verbesserung nebenbei" und unterbleibt bewusst (siehe Abschnitt 7, offene Punkte).

---

## 6. Umsetzungsplan

Reihenfolge laut Auftrag, nach jedem Schritt `npm run build` **und** `tsc --noEmit` grün,
je ein Commit:

1. **Types** — `lib/types.ts` → `lib/types/`-Module, Duplikate entfernen, Imports bleiben
   über Index kompatibel (`@/lib/types`, `../types`, `./types`).
2. **Repositories** — `createPendingRegistration` nach `lib/db/registrations.ts`,
   Inline-SQL aus der API-Route entfernen, `lib/db.ts` löschen.
3. **Ordnerstruktur** — Komponenten-Moves laut Kapitel 3 (Dateinamen zunächst unverändert).
4. **Benennung** — kebab-case-Renames laut Kapitel 4.
5. **CSS** — Verifikation (keine Änderung nötig), Report-Abschluss.

Baseline vor Beginn: `tsc --noEmit` ✓ · `npm run build` ✓ (Next 16, alle Routen kompilieren).

---

## 7. Umsetzungs-Log & offene Punkte

_(wird nach Abschluss der Schritte ergänzt)_
