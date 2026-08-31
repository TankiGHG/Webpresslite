# Betrieb

Wie webpresslite auf einem Server läuft: Erstinstallation, Updates, Backups und
was zu tun ist, wenn etwas klemmt.

## Voraussetzungen

- Debian 12 (oder vergleichbar) mit Docker und Docker Compose
- Ein Reverse Proxy, der TLS terminiert — hier: Nginx Proxy Manager
- Wildcard-DNS `*.<domain>` auf den Server
- Ein Wildcard-Zertifikat für `<domain>` und `*.<domain>` (DNS-Challenge)

## Erstinstallation

```bash
git clone <repo> /opt/webpresslite
cd /opt/webpresslite

cp .env.example .env
$EDITOR .env            # siehe unten
docker compose -f docker-compose.prod.yml up -d
```

Beim Start wendet der Container zuerst die Migrationen an und startet erst
danach den Server. Schlägt die Migration fehl, startet der Container **nicht** —
das ist Absicht: eine Anwendung, die nicht zum Schema passt, soll keine
Anfragen beantworten.

### Was in die `.env` gehört

Pflicht, ohne diese Werte startet nichts:

| Variable                                                | Bedeutung                            |
| ------------------------------------------------------- | ------------------------------------ |
| `ROOT_DOMAIN`                                           | Basis-Domain, z. B. `example.com`    |
| `APP_URL`                                               | `https://example.com`                |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`     | Datenbank                            |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` | Objektspeicher                       |
| `NEXT_PUBLIC_MEDIA_URL`                                 | Öffentliche Basis-URL der Medien     |
| `MINIO_CORS_ORIGINS`                                    | Origins, die direkt hochladen dürfen |
| `AUTH_SECRET`                                           | `openssl rand -base64 32`            |
| `CRON_SECRET`                                           | `openssl rand -hex 32`               |

Optional: `SMTP_*` (ohne `SMTP_HOST` werden Mails nur geloggt — dann funktionieren
Passwort-Reset und Einladungen praktisch nicht), `GITHUB_CLIENT_ID` /
`GITHUB_CLIENT_SECRET`, `LOG_LEVEL`.

### Reverse Proxy

Die App lauscht nur auf `127.0.0.1:${APP_PORT}`. Postgres und MinIO sind von
außen gar nicht erreichbar.

Im Nginx Proxy Manager einen Host für `<domain>` **und** `*.<domain>` anlegen,
Ziel `127.0.0.1:3000`. Zwingend erforderlich:

```
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
```

Ohne `X-Forwarded-Host` bricht das Tenant-Routing: die App sieht dann nur den
internen Hostnamen und kann keine Site auflösen. Ohne `X-Forwarded-For` greift
das Rate Limit für Kommentare für alle Besucher gemeinsam.

Die Uploads gehen **direkt vom Browser** in den Objektspeicher. Damit das
funktioniert, muss `NEXT_PUBLIC_MEDIA_URL` von außen erreichbar sein — entweder
ein eigener Proxy-Host auf `minio:9000` oder ein separater Hostname. Die dort
verwendeten Origins gehören in `MINIO_CORS_ORIGINS`.

### Geplante Beiträge

Ein Scheduler auf dem Host, minütlich:

```cron
* * * * * curl -fsS -X POST https://example.com/api/cron/publish-scheduled \
  -H "authorization: Bearer <CRON_SECRET>" > /dev/null
```

Ohne diesen Aufruf bleiben geplante Beiträge geplant.

## Prüfen, ob alles läuft

```bash
curl -s https://example.com/api/health | jq
```

`"status": "ok"` heißt: Datenbank und Objektspeicher antworten. Der Endpunkt
liefert `503`, sobald einer von beiden ausfällt, und ist damit auch die Grundlage
des Container-Healthchecks.

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

## Update

```bash
cd /opt/webpresslite
git pull
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
```

Migrationen laufen beim Start automatisch. **Vor einem Update mit Migrationen
ein Backup ziehen** — ein Rollback der Anwendung macht eine angewendete
Migration nicht rückgängig.

## Backups

```bash
./scripts/backup.sh
```

Legt unter `./backups/<zeitstempel>/` einen Datenbank-Dump und eine Kopie des
Objektspeichers ab — beides aus demselben Moment, damit ein Restore nicht
Datenbank und Medien aus verschiedenen Zeitpunkten mischt. Ältere Sätze werden
erst gelöscht, **nachdem** der neue vollständig ist.

Per Cron:

```cron
0 3 * * * cd /opt/webpresslite && ./scripts/backup.sh >> /var/log/webpresslite-backup.log 2>&1
```

Steuerbar über `BACKUP_ROOT` (Standard `./backups`) und `KEEP_DAYS` (Standard 14).

**Die Backups gehören vom Server herunter.** Ein Backup auf derselben Platte
hilft gegen einen Fehlgriff, nicht gegen einen Ausfall.

### Wiederherstellen

```bash
./scripts/restore.sh ./backups/2026-08-31T03-00-00Z
```

Das Skript fragt nach, stoppt die App, spielt Datenbank und Medien zurück und
startet sie wieder. Ein Restore sollte einmal geprobt werden, bevor er gebraucht
wird.

## Sicherheit

Die Anwendung setzt selbst:

- `Content-Security-Policy` mit Nonce je Anfrage; Skripte aus fremden Quellen
  laufen nicht
- `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`

Gesetzt werden sie von der Anwendung, nicht vom Proxy — der Proxy ist
Konfiguration, die wir nicht mitliefern, und ein fehlender Header fällt niemandem
auf.

Rate Limits: Anmeldung 10/Minute, Registrierung 30/Stunde, Passwort-Reset
3/Stunde (je IP), Uploads 20/Minute (je Nutzer), Kommentare 5 je 10 Minuten
(je IP).

Der Container läuft als unprivilegierter Nutzer und schreibt nirgends ins
Image.

## Logging

Ein JSON-Objekt je Zeile, damit ein Collector es ohne eigenen Parser liest.
Passwörter, Token und E-Mail-Adressen werden aus den Feldern entfernt, bevor
etwas geschrieben wird.

`LOG_LEVEL` steuert die Ausführlichkeit (`debug`, `info`, `warn`, `error`).
Docker rotiert die Logs auf 5 × 10 MB je Container.

## Wenn etwas klemmt

| Symptom                          | Wahrscheinliche Ursache                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| Alle Sites liefern 404           | `X-Forwarded-Host` fehlt im Proxy, oder `ROOT_DOMAIN` passt nicht           |
| `INVALID_ORIGIN` beim Anmelden   | `APP_URL` stimmt nicht mit der aufgerufenen Adresse überein                 |
| Uploads scheitern sofort         | CORS am Bucket: `MINIO_CORS_ORIGINS` prüfen                                 |
| Bilder laden nicht               | `NEXT_PUBLIC_MEDIA_URL` von außen nicht erreichbar                          |
| Geplante Beiträge bleiben liegen | Cron ruft `/api/cron/publish-scheduled` nicht auf, oder `CRON_SECRET` fehlt |
| Container startet nicht          | Migration fehlgeschlagen — `docker compose logs app` zeigt den Grund        |
| Health meldet `storage: error`   | MinIO nicht erreichbar oder Zugangsdaten falsch                             |

## Was dieser Aufbau nicht abdeckt

- **Eine Instanz.** Cache-Invalidierung und Rate Limits liegen im Prozess. Für
  mehrere App-Instanzen bräuchte es einen gemeinsamen Speicher dafür.
- **Kein Monitoring.** Der Health-Endpunkt ist da; ein Alarm darauf ist nicht
  Teil dieses Repos.
- **Keine Abrechnung.** Pläne werden durchgesetzt, aber niemand wird belastet.
