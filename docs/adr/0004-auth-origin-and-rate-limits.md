# ADR 0004 — Origin-Prüfung und Rate Limits der Auth-Endpunkte

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

better-auth lehnt Requests ab, deren `Origin` nicht zu `baseURL` passt. Das ist
ein CSRF-Schutz und soll bleiben. In der Entwicklung führt es aber dazu, dass
ein Aufruf über `127.0.0.1:3000` mit `INVALID_ORIGIN` scheitert, während
`APP_URL` auf `http://lvh.me:3000` zeigt.

Rate Limits sind bei better-auth außerhalb von Produktion standardmäßig aus.
Die Auth-Endpunkte sind aber genau die, die überall geschützt gehören.

## Entscheidung

- `baseURL` ist `APP_URL`. Entwicklung und Tests laufen konsequent über
  `http://lvh.me:3000`. Das ist in README und Playwright-Konfiguration
  festgehalten.
- Rate Limiting ist in allen Umgebungen aktiv. Limits pro IP:
  Anmeldung 10/Minute, Registrierung 10/Stunde, Reset anfordern 3/Stunde,
  Reset einlösen 5/Stunde, alles Übrige 100/Minute.
- Die Limits sind bewusst nicht schärfer: Sie greifen pro IP, und hinter einem
  gemeinsamen NAT teilen sich viele legitime Nutzer eine Adresse. Fünf
  Anmeldungen pro Minute hatten in der Praxis bereits den eigenen E2E-Lauf
  blockiert.

## Konsequenzen

- Sobald in Phase 2 Sites unter eigenen Subdomains laufen, müssen deren Origins
  über `trustedOrigins` ergänzt werden, sonst scheitern Auth-Requests von dort.
- Der Speicher der Limits liegt im Prozess. Bei mehreren App-Instanzen zählt
  jede für sich; das ist für den geplanten Single-Container-Betrieb in Ordnung
  und in Phase 8 erneut zu prüfen.
- Anmeldung und Passwort-Reset melden nie, ob eine Adresse existiert.
