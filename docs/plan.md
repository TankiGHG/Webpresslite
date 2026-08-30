# Projektplan webpresslite

Die Phasen werden strikt der Reihe nach abgearbeitet. Jede Phase endet mit
grünem `pnpm typecheck && pnpm lint && pnpm test && pnpm build`, einem
Statusbericht und einer Freigabe, bevor die nächste beginnt.

## Phase 0 — Fundament

**Fertig wenn:** `pnpm dev` startet, `/api/health` liefert DB- und Storage-Status, CI ist grün.

- [x] Repo-Struktur, pnpm-Setup
- [x] Next.js 15 (App Router), TypeScript `strict`
- [x] Tailwind CSS v4 + shadcn/ui-Basis
- [x] Drizzle ORM + Drizzle Kit, zentrale Datenzugriffsschicht angelegt
- [x] `docker-compose.dev.yml` (Postgres 16 + MinIO inkl. Bucket-Init)
- [x] `.env.example` und validierte Env-Schicht (`src/lib/env.ts`)
- [x] ESLint + Prettier
- [x] Vitest- und Playwright-Grundgerüst
- [x] GitHub Actions (typecheck, lint, format, test, build)
- [x] `/api/health` mit DB- und Storage-Check
- [x] `CLAUDE.md`, `README.md`, `docs/plan.md`, `docs/adr/`
- [x] Seed-Skript angelegt (wächst mit dem Schema)

## Phase 1 — Auth & Accounts

**Fertig wenn:** E2E-Test läuft Registrierung → Login → geschützte Seite → Logout durch.

- [x] better-auth einrichten, Auth-Tabellen migriert (`0000_gifted_wither.sql`)
- [x] Registrierung, Login, Logout
- [x] Passwort-Reset per Mail (SMTP, ohne `SMTP_HOST` Ausgabe ins Log)
- [x] Profilseite inkl. Passwortwechsel
- [x] Geschützte Routen (`requireSession`)
- [x] Rate Limit auf Auth-Endpunkte
- [x] Optionales GitHub OAuth (nur aktiv, wenn beide ENV gesetzt sind)
- [x] E2E-Test des vollen Pfads

## Phase 2 — Sites & Tenant-Routing

**Fertig wenn:** zwei Sites parallel unter unterschiedlichen Subdomains erreichbar sind
und Cross-Tenant-Zugriff im Test fehlschlägt.

- [x] Tabellen `sites`, `site_members` (Migration `0001_serious_nekra.sql`)
- [x] Site anlegen: Name + Subdomain, Live-Verfügbarkeitsprüfung, Reserved-List
- [x] Site löschen (nur Eigentümer:in, mit Tippbestätigung)
- [x] Site-Umschalter im Dashboard
- [x] Middleware-Routing auf `/_sites/[siteId]/...` (Node-Runtime, mit Host-Cache)
- [x] Platzhalterseite unter der Subdomain
- [x] Test: Cross-Tenant-Zugriff schlägt fehl

## Phase 3 — Inhalte & Editor

**Fertig wenn:** ein Beitrag geschrieben, gespeichert, geplant und automatisch veröffentlicht wird.

- [x] Tabelle `posts` (post|page), Migration `0002_wonderful_wolf_cub.sql`
- [x] CRUD für Beiträge und Seiten
- [x] TipTap-Editor (v2) mit debounced Autosave
- [x] Slug-Generierung, `unique(site_id, slug)`
- [x] Entwurf / Planung / Veröffentlichung
- [x] Vorschau-Modus
- [x] Cronjob für geplante Beiträge (`POST /api/cron/publish-scheduled`)
- [x] Serverseitiges Sanitizing des Editor-HTML

## Phase 4 — Öffentliches Rendering & Themes

**Fertig wenn:** Lighthouse ≥ 95 in Performance/SEO/Accessibility auf der Beitragsseite.

- [ ] Startseite mit Pagination, Einzelbeitrag, statische Seiten, Archiv, 404
- [ ] 3 Themes über CSS-Variablen
- [ ] Theme-Anpassung im Dashboard (Farben, Schrift, Logo)
- [ ] RSS-Feed, `sitemap.xml`, `robots.txt`
- [ ] OG-Images, SEO-Meta-Tags
- [ ] Caching mit `revalidateTag`

## Phase 5 — Medien

**Fertig wenn:** ein Bild aus dem Editor hochgeladen, eingebettet und im Frontend
responsiv ausgeliefert wird.

- [ ] Tabelle `media`
- [ ] Upload nach MinIO über presigned URLs
- [ ] Varianten via `sharp` (thumb/medium/full, WebP)
- [ ] Medienbibliothek mit Auswahl-Dialog im Editor
- [ ] Alt-Texte
- [ ] Löschen inkl. Storage-Aufräumen
- [ ] Größen- und MIME-Prüfung, Rate Limit

## Phase 6 — Taxonomien, Suche, Kommentare

**Fertig wenn:** ein Kommentar erscheint erst nach Freigabe öffentlich.

- [ ] Tabellen `categories`, `tags`, `post_tags`, `comments`
- [ ] Kategorie- und Tag-Archivseiten
- [ ] Postgres-Volltextsuche pro Site
- [ ] Kommentarformular
- [ ] Moderations-Queue
- [ ] Spam-Schutz: Honeypot + Rate Limit

## Phase 7 — Team, Statistik, Custom Domain

**Fertig wenn:** ein Editor kann Beiträge schreiben, aber keine Site-Einstellungen ändern.

- [ ] Einladungen per Mail
- [ ] Rollen und Berechtigungsmatrix (owner/admin/editor/author)
- [ ] Tabelle `page_views`, Tages-Aggregation
- [ ] Statistik-Charts im Dashboard
- [ ] Custom-Domain-Flow mit TXT-Verifizierung
- [ ] Plan-Limits (free/pro) inkl. Enforcement, Payment als Stub

## Phase 8 — Deployment & Härtung

**Fertig wenn:** ein frischer Server mit `docker compose up -d` und gepflegter `.env` läuft.

- [ ] Multi-Stage-Dockerfile (`output: 'standalone'`)
- [ ] `docker-compose.prod.yml`
- [ ] Migrationen beim Start
- [ ] Backup-Skript für DB und MinIO
- [ ] Security-Header
- [ ] Logging
- [ ] Betriebsdokumentation
