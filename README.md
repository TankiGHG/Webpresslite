# webpresslite

Gehostete Publishing-Plattform: Nutzer registrieren sich, legen eine oder mehrere
Websites an, schreiben Beiträge in einem modernen Editor und veröffentlichen sie
unter einer eigenen Subdomain mit wählbarem Theme.

Der Stand der Umsetzung steht in [`docs/plan.md`](docs/plan.md).

## Voraussetzungen

- Node.js 22+
- pnpm 10+ (`corepack enable`)
- Docker mit Compose

## Schnellstart

```bash
pnpm install
cp .env.example .env.local

# Postgres 16 und MinIO starten (MinIO-Bucket wird automatisch angelegt)
docker compose -f docker-compose.dev.yml up -d

pnpm db:migrate       # Migrationen anwenden
pnpm dev
```

Die App läuft dann auf **http://lvh.me:3000**.

`lvh.me` löst öffentlich auf `127.0.0.1` auf. Dadurch funktionieren Subdomains
wie `meineseite.lvh.me:3000` in der Entwicklung ohne Einträge in `/etc/hosts`.
`localhost` bietet das nicht zuverlässig — deshalb bitte `lvh.me` verwenden.

### Systemstatus prüfen

```bash
curl -s http://lvh.me:3000/api/health | jq
```

Liefert HTTP 200 mit `"status": "ok"`, wenn Datenbank **und** Storage erreichbar
sind, sonst HTTP 503 mit dem jeweiligen Fehler pro Check.

## Befehle

| Befehl             | Zweck                                      |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Entwicklungsserver                         |
| `pnpm build`       | Produktions-Build (`output: 'standalone'`) |
| `pnpm typecheck`   | TypeScript ohne Emit                       |
| `pnpm lint`        | ESLint                                     |
| `pnpm format`      | Prettier schreiben                         |
| `pnpm test`        | Vitest (Unit/Integration)                  |
| `pnpm test:e2e`    | Playwright (E2E)                           |
| `pnpm db:generate` | Migration aus dem Schema erzeugen          |
| `pnpm db:migrate`  | Migrationen anwenden                       |
| `pnpm db:studio`   | Drizzle Studio                             |
| `pnpm db:seed`     | Entwicklungsdaten einspielen               |

## Konfiguration

Alle Einstellungen kommen aus Umgebungsvariablen. `.env.example` ist die
Referenz und wird bei jeder neuen Variable mitgepflegt. Gelesen wird
ausschließlich über `src/lib/env.ts`, das die Konfiguration beim Start
validiert und bei fehlenden Werten mit einer klaren Fehlermeldung abbricht.

Für die lokale Entwicklung reichen die Werte aus `.env.example` unverändert —
mit Ausnahme von `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Projektstruktur

```
src/app/(platform)/ Dashboard und Auth
src/app/(site)/     öffentliches Rendering pro Tenant
src/app/            Next.js App Router
src/components/ui/  shadcn/ui-Komponenten
src/lib/env.ts      validierte Konfiguration
src/lib/auth/       better-auth Server, Client, Session-Helfer
src/lib/tenant/     Host-Parsing, Reserved-List, Subdomain-Validierung
src/lib/editor/     TipTap-Extensions, serverseitiges Rendering, Sanitizing
src/lib/posts/      Slugs und Beitrags-Vokabular
src/lib/mail/       SMTP-Versand und Mail-Vorlagen
src/lib/db/         Drizzle-Client, Schema, Queries
src/lib/storage/    S3/MinIO-Client
drizzle/            generierte Migrationen (unveränderlich, sobald angewendet)
docs/adr/           Architekturentscheidungen
tests/unit/         Vitest
tests/e2e/          Playwright
```

Alle Datenbankzugriffe laufen über `src/lib/db/queries/*`. Direkte
Drizzle-Aufrufe in Komponenten oder Route Handlern sind per ESLint-Regel
untersagt, damit Tenant-Scoping und Berechtigungsprüfung nicht umgangen werden.

## Auth

Registrierung, Login und Passwort-Reset laufen über
[better-auth](https://better-auth.com) mit E-Mail und Passwort. GitHub OAuth ist
optional und wird nur registriert, wenn `GITHUB_CLIENT_ID` **und**
`GITHUB_CLIENT_SECRET` gesetzt sind.

Ohne konfigurierten `SMTP_HOST` werden Mails nicht versendet, sondern ins Log
geschrieben — praktisch für die lokale Entwicklung: den Reset-Link findest du
dann in der Ausgabe von `pnpm dev`.

**Wichtig:** better-auth prüft den Origin gegen `APP_URL`. Rufe die App in der
Entwicklung deshalb über `http://lvh.me:3000` auf, nicht über `127.0.0.1:3000` —
sonst werden alle Auth-Requests mit `INVALID_ORIGIN` abgelehnt.

Rate Limits pro IP: Anmeldung 10/Minute, Registrierung 10/Stunde,
Passwort-Reset anfordern 3/Stunde.

Der Seed legt eine Demo-Nutzerin an: `demo@example.com` / `demo-password-123`.

## Multi-Tenancy

Jede Site ist unter `<subdomain>.<ROOT_DOMAIN>` erreichbar. Die Middleware liest
den Host (hinter dem Proxy `X-Forwarded-Host`), löst ihn gegen die Datenbank auf
und rewritet auf `/_sites/[siteId]/...`.

`example.com`, `www.` und `app.` gelten als Plattform, alles andere unter der
Root-Domain als Tenant, alles außerhalb als Custom Domain (Phase 7).

Lokal funktioniert das ohne Konfiguration, weil `lvh.me` und alle seine
Subdomains auf `127.0.0.1` zeigen — `meineseite.lvh.me:3000` erreicht direkt die
Site. Der Seed legt `demo.lvh.me:3000` an.

Reservierte Subdomains stehen in `src/lib/tenant/reserved.ts`.

## Inhalte

Beiträge und Seiten werden im TipTap-Editor geschrieben. Gespeichert wird das
JSON-Dokument; das HTML entsteht **serverseitig** daraus und wird gegen eine
Allow-List sanitized. Der Browser liefert nie HTML.

Ein Beitrag ist `draft`, `scheduled` oder `published`. Öffentlich sichtbar ist
er erst, wenn er veröffentlicht **und** sein Zeitpunkt erreicht ist.

- Beiträge: `https://<site>/beitrag/<slug>`
- Seiten: `https://<site>/<slug>`

### Geplante Beiträge

Ein Scheduler muss regelmäßig — sinnvoll ist einmal pro Minute — folgendes
aufrufen:

```bash
curl -X POST https://<APP_URL>/api/cron/publish-scheduled \
  -H "authorization: Bearer $CRON_SECRET"
```

Der Aufruf ist idempotent; ohne fällige Beiträge passiert nichts. Ohne gesetztes
`CRON_SECRET` antwortet der Endpunkt mit 503, statt offen zu stehen.

## Tests

```bash
pnpm test                      # Vitest
pnpm test:e2e                  # Playwright, startet den Build selbst
E2E_BASE_URL=http://lvh.me:3000 pnpm test:e2e   # gegen laufenden Server
```

## Lizenz

Noch nicht festgelegt.

### Playwright-Browser

`@playwright/test` ist auf 1.56.1 gepinnt. Beim ersten Aufsetzen einmalig:

```bash
pnpm exec playwright install --with-deps chromium
```
