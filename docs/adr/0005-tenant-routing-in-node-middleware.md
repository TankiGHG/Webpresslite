# ADR 0005 — Tenant-Routing in der Node-Middleware

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

Die Middleware soll den Host gegen `sites.subdomain` bzw. `sites.custom_domain`
auflösen und auf `/_sites/[siteId]/...` rewriten. Zwei Dinge stehen dem im Weg:

1. Die Edge-Runtime kann `postgres-js` nicht ausführen.
2. Die Middleware läuft bei **jedem** Request. Eine ungecachte Abfrage legt eine
   Datenbank-Roundtrip vor jeden Seitenaufruf.

Dazu kommt eine Falle von Next: Ordner, die mit `_` beginnen, sind _Private
Folders_ und werden vom Routing ausgeschlossen. Ein Verzeichnis `app/_sites`
erzeugt keine Route — der Rewrite läuft ins Leere und liefert 404.

## Entscheidung

- Die Middleware läuft mit `runtime: 'nodejs'` und macht die Auflösung selbst.
- Vor die Abfrage kommt ein prozesslokaler Cache mit 30 Sekunden TTL. Auch
  negative Ergebnisse werden gecacht, sonst ist ein unbekannter Host ein
  kostenloser Weg, Datenbanklast zu erzeugen. Beim Anlegen und Löschen einer
  Site wird der Cache geleert.
- Das Routenverzeichnis heißt `app/(site)/%5Fsites/[siteId]`. `%5F` ist der von
  Next dokumentierte Weg, einen führenden Unterstrich im URL-Segment zu
  behalten, ohne den Ordner privat zu machen. Der Rewrite-Pfad bleibt damit wie
  geplant `/_sites/[siteId]/...`.
- `/api/*` wird nicht gerewritet: Auth und Health gehören zur Plattform, auch
  wenn sie unter einem Tenant-Host angefragt werden.
- Fehlt `ROOT_DOMAIN`, lässt die Middleware den Request durch, statt die ganze
  Plattform wegen eines Konfigurationsfehlers lahmzulegen. Der Health-Endpunkt
  meldet das eigentliche Problem.

## Konsequenzen

- Eine neu angelegte Subdomain ist sofort erreichbar, weil der Cache beim
  Anlegen geleert wird. Bei mehreren App-Instanzen gilt das nur für die Instanz,
  die den Request bearbeitet hat; die übrigen ziehen nach spätestens 30 Sekunden
  nach. Für den geplanten Single-Container-Betrieb ist das unkritisch, in Phase 8
  erneut zu prüfen.
- Die Middleware hängt an der Datenbank. Ist Postgres weg, sind auch die
  Tenant-Seiten weg — was ohnehin der Fall wäre, sobald sie Inhalte rendern.
