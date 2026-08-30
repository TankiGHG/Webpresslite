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
src/app/            Next.js App Router
src/components/ui/  shadcn/ui-Komponenten
src/lib/env.ts      validierte Konfiguration
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
