# CLAUDE.md — webpresslite

Arbeitsanweisung für Claude Code in diesem Repository. Kurz halten, aktuell halten.

## Was das ist

Gehostete Publishing-Plattform: Nutzer legen Sites an, schreiben Beiträge und
veröffentlichen sie unter einer eigenen Subdomain mit wählbarem Theme.
Ein moderner Nachbau der Kernfunktionen von WordPress.com — ohne PHP, ohne Plugins.

## Stack

| Bereich   | Wahl                                                       |
| --------- | ---------------------------------------------------------- |
| Framework | Next.js 15, App Router, React Server Components            |
| Sprache   | TypeScript `strict`, zusätzlich `noUncheckedIndexedAccess` |
| Styling   | Tailwind CSS v4 (CSS-first, `@theme`) + shadcn/ui          |
| Datenbank | PostgreSQL 16                                              |
| ORM       | Drizzle ORM + Drizzle Kit                                  |
| Auth      | better-auth (E-Mail/Passwort, optional GitHub OAuth)       |
| Editor    | TipTap v2 (JSON + serverseitig gerendertes HTML)           |
| Medien    | S3-kompatibel via MinIO, `sharp` für Varianten             |
| Mail      | SMTP (Mailcow), Konfiguration ausschließlich per ENV       |
| Tests     | Vitest (Unit/Integration), Playwright (E2E)                |
| Paketmgr  | pnpm                                                       |

## Befehle

```bash
pnpm dev              # Dev-Server auf http://lvh.me:3000
pnpm typecheck        # tsc --noEmit
pnpm lint             # ESLint
pnpm format           # Prettier schreiben  (format:check nur prüfen)
pnpm test             # Vitest
pnpm test:e2e         # Playwright
pnpm build            # Produktions-Build (standalone, kopiert Assets)
pnpm start            # Standalone-Server aus dem Build
pnpm db:generate      # Migration aus dem Schema erzeugen
pnpm db:migrate       # Migrationen anwenden
pnpm db:seed          # Entwicklungsdaten
pnpm lighthouse       # Lighthouse gegen die öffentlichen Seiten
pnpm build:migrate    # Migrations-Runner als eine Datei bündeln
pnpm db:deploy        # Migrationen anwenden (Produktion, ohne drizzle-kit)
docker compose -f docker-compose.dev.yml up -d   # Postgres + MinIO
```

Vor jedem Abschluss einer Phase muss durchlaufen:
`pnpm typecheck && pnpm lint && pnpm test && pnpm build`

## Architektur

- **Multi-Tenancy über Subdomains.** Die Middleware liest den `Host`-Header
  (in Produktion hinter dem Proxy `X-Forwarded-Host`), löst ihn gegen
  `sites.subdomain` bzw. `sites.custom_domain` auf und rewritet auf
  `/_sites/[siteId]/...`. Plattform (Dashboard, Auth) läuft auf der Root-Domain
  und auf `app.<ROOT_DOMAIN>`.
- **Bereichstrennung.** `app/(platform)` = Dashboard und Auth,
  `app/(site)` = öffentliches Rendering. Gemeinsam ist nur die Datenzugriffsschicht.
- **Datenzugriff zentral.** Alle DB-Zugriffe laufen über `src/lib/db/queries/*`.
  Jede Query auf Site-Daten nimmt eine `siteId` und prüft die Berechtigung.
  Kein direkter Drizzle-Aufruf in Komponenten oder Route Handlern — ESLint
  erzwingt das über `no-restricted-imports`.
- **Konfiguration** ausschließlich über `src/lib/env.ts`. Kein `process.env`
  irgendwo sonst (Ausnahme: `next.config.ts`, `drizzle.config.ts`, Skripte).
- **Caching.** Öffentliche Site-Seiten statisch mit `revalidateTag`,
  Invalidierung beim Publish/Update eines Beitrags.
- **Sicherheitsheader** setzt die Anwendung selbst (Middleware), nicht der Proxy.
  Die CSP trägt eine Nonce je Anfrage.
- **Editor-Inhalte.** `content_json` ist die Quelle der Wahrheit, `content_html`
  ein serverseitig gerenderter und sanitizeter Cache. Der Client liefert nie HTML.

## Konventionen

- Code, Kommentare, Commit-Messages: **Englisch**.
  Doku, README, Statusberichte: **Deutsch**.
- Conventional Commits, kleine Commits.
- Kommentare erklären das _Warum_, nicht das _Was_. Sparsam.
- Server Components sind der Default; `'use client'` nur wo nötig.
- Keine `any` ohne begründenden Kommentar. Kein `@ts-ignore`.

## Do

- Vor der Nutzung einer Library: Version in `package.json` prüfen, Doku lesen.
- Architekturentscheidungen mit Tragweite als kurzes ADR in `docs/adr/`.
- `.env.example` bei jeder neuen ENV-Variable mitpflegen.
- Editor-HTML serverseitig sanitizen; Uploads auf Größe und MIME prüfen.
- Storage-Keys immer serverseitig bilden, nie aus einem Dateinamen ableiten.
- Nach drei erfolglosen Fix-Versuchen: stoppen, Problem beschreiben, fragen.

## Don't

- Keine Secrets im Repo.
- Angewendete Migrationen nicht mehr ändern — neue Migration schreiben.
- Keine Phase vorziehen, kein vorauseilendes Refactoring.
- Keine Platzhalter-Implementierungen und keine `TODO`-Wüsten.
- Kein PHP, kein WordPress-Code, keine WordPress-Kompatibilität.
