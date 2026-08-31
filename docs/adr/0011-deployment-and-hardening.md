# ADR 0011 — Deployment und Härtung

- **Status:** akzeptiert
- **Datum:** 2026-08-31

## Kontext

Phase 8 bringt das Image, den Produktions-Stack, Migrationen beim Start,
Backups, Security-Header und Logging. Fünf Punkte brauchen eine Festlegung.

## Entscheidungen

### Migrationen laufen beim Start, und ein Fehler verhindert den Start

Der Entrypoint wendet erst die Migrationen an und startet danach den Server.
Schlägt das fehl, startet der Container nicht — eine Anwendung, die nicht zum
Schema passt, soll keine Anfragen beantworten.

Der Runner ist mit esbuild in **eine** Datei gebündelt (rund 260 KB). Das
Standalone-Bundle von Next enthält weder `drizzle-orm` noch `postgres` als
Verzeichnisse — beide werden in die Server-Chunks eingebacken. Statt für die
Migration einen zweiten `node_modules`-Baum ins Image zu kopieren, bringt das
Bundle seine Abhängigkeiten selbst mit.

### `upgrade-insecure-requests` nur, wo TLS wirklich anliegt

Die Direktive gehörte zunächst fest in die CSP. Über HTTP hebt sie **jeden**
Subresource-Request auf `https://` — der Server spricht dort kein TLS, alle
Assets scheitern mit einem Connection Reset, nichts hydratisiert. Das Formular
fällt dann auf ein natives Submit zurück, und das sieht aus wie ein
Anwendungsfehler, nicht wie ein Header-Problem.

Gesetzt wird sie deshalb nur, wenn `X-Forwarded-Proto: https` anliegt oder die
Anfrage selbst über HTTPS kam.

### Die CSP trägt eine Nonce je Anfrage

`script-src 'self' 'nonce-…' 'strict-dynamic'` — kein `unsafe-inline`, und
`unsafe-eval` ausschließlich in der Entwicklung, wo Fast Refresh es braucht.
Die Middleware setzt die Policy sowohl auf die _Anfrage_ als auch auf die
Antwort: Next liest die Nonce aus dem Anfrage-Header und setzt sie auf seine
eigenen Script-Tags.

`connect-src` und `img-src` enthalten den Objektspeicher, weil der Browser dort
direkt hochlädt. `img-src` erlaubt zusätzlich `https:`, weil das Logo einer
Site auf eine beliebige fremde Adresse zeigen darf.

Die Header setzt die **Anwendung**, nicht der Proxy. Der Proxy ist
Konfiguration, die dieses Repository nicht mitliefert, und ein fehlender Header
fällt niemandem auf.

### Backups fassen Datenbank und Medien zusammen

Ein Lauf schreibt beides in **ein** Verzeichnis mit Zeitstempel. Ein Restore,
der einen Datenbank-Dump mit Medien aus einem anderen Moment kombiniert,
erzeugt Beiträge, deren Bilder fehlen. Ältere Sätze werden erst gelöscht,
nachdem der neue vollständig ist.

Der Dump liegt im Custom-Format: er lässt sich mit `pg_restore` selektiv
zurückspielen und ist komprimiert.

### Logging als JSON, mit fester Redaktionsliste

Ein Objekt je Zeile, damit ein Collector es ohne eigenen Parser liest.
Passwörter, Token und E-Mail-Adressen werden entfernt, bevor etwas geschrieben
wird — eine Logdatei lesen mehr Leute als eine Datenbank.

## Konsequenzen

- Nichts außer der App ist von außen erreichbar, und die App nur auf
  `127.0.0.1`. Postgres und MinIO haben kein Port-Mapping.
- Der Container läuft als unprivilegierter Nutzer und schreibt nirgends ins
  Image.
- Der Health-Endpunkt ist zugleich der Container-Healthcheck: was `503` liefert,
  gilt als ungesund.
- Der Aufbau ist auf **eine** Instanz ausgelegt. Cache-Invalidierung und Rate
  Limits liegen im Prozess; mehrere Instanzen bräuchten einen gemeinsamen
  Speicher dafür. Das steht so in der Betriebsdokumentation.
