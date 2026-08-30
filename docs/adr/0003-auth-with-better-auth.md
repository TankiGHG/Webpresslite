# ADR 0003 — Authentifizierung mit better-auth und eigenem Drizzle-Schema

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

better-auth verwaltet Nutzer, Sitzungen und Accounts. Die zugehörigen Tabellen
werden üblicherweise mit `@better-auth/cli generate` erzeugt. Die CLI liegt
aktuell aber nur in Version 1.4.22 vor, während die Library bei 1.7.2 steht;
die CLI bricht beim Laden der Konfiguration mit einem Versionskonflikt ab.

## Entscheidung

Das Drizzle-Schema für `user`, `session`, `account` und `verification` wird von
Hand gepflegt. Als Referenz dient `getSchema()` aus `better-auth/db` — die
Funktion liefert genau die Felddefinitionen, die der Adapter zur Laufzeit
erwartet. Die Property-Namen der Drizzle-Tabellen müssen den Feldnamen von
better-auth entsprechen (`emailVerified`, nicht `email_verified`), weil der
Adapter Spalten darüber nachschlägt; die Datenbankspalten bleiben snake_case.

Die Auth-Instanz wird über `getAuth()` lazy erzeugt statt auf Modulebene, damit
`next build` ohne erreichbare Datenbank funktioniert.

## Konsequenzen

- Bei einem Update von better-auth muss geprüft werden, ob sich die Kernmodelle
  geändert haben. `getSchema()` ausgeben und mit `src/lib/db/schema.ts`
  vergleichen; Abweichungen als neue Migration nachziehen.
- Sobald die CLI zur Library aufschließt, kann die Generierung wieder
  automatisiert werden. Die Tabellenstruktur ändert sich dadurch nicht.
- `src/lib/auth/server.ts` ist von der ESLint-Regel `no-restricted-imports`
  ausgenommen, weil es dem Adapter die Drizzle-Instanz übergeben muss.
