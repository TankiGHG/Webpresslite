# ADR 0002 — Tenant-Auflösung über den Host-Header

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

Jede Site der Plattform ist unter einer eigenen Subdomain erreichbar
(`meineseite.example.com`) und optional unter einer Custom Domain. Next.js
braucht daraus einen Routing-Pfad. In Produktion terminiert ein Nginx Proxy
Manager TLS, die App sieht den ursprünglichen Host nur über
`X-Forwarded-Host`.

## Entscheidung

Die Middleware ermittelt den effektiven Host in dieser Reihenfolge:
`X-Forwarded-Host` → `Host`. Endet er auf `ROOT_DOMAIN`, wird die Subdomain
abgeschnitten; ist sie leer oder `app`, gilt die Anfrage der Plattform.
Andernfalls wird der Host als Custom Domain behandelt. Der aufgelöste Tenant
wird auf `/_sites/[siteId]/...` gerewritet.

Lokal wird `lvh.me` verwendet — die Domain löst öffentlich auf `127.0.0.1` auf,
sodass `site1.lvh.me:3000` ohne `/etc/hosts`-Einträge funktioniert.

## Konsequenzen

- `ROOT_DOMAIN` inklusive Port ist eine Pflicht-ENV; ohne sie ist keine
  Tenant-Auflösung möglich.
- Der Proxy **muss** `X-Forwarded-Host` und `X-Forwarded-Proto` setzen, sonst
  bricht das Routing. Das gehört in die Betriebsdokumentation (Phase 8).
- Die lokale Entwicklung hängt an der externen DNS-Auflösung von `lvh.me`.
  Fällt sie aus, sind `/etc/hosts`-Einträge der Rückfallweg.
