# ADR 0008 — Medien: Upload, Varianten und Auslieferung

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

Bilder sollen über presigned URLs direkt vom Browser in den Objektspeicher
gehen, in Varianten vorliegen und im Frontend responsiv ausgeliefert werden.
Drei Punkte brauchen eine Festlegung.

## Entscheidungen

### Der Upload läuft in drei Schritten

1. Der Client fragt eine presigned PUT-URL an. Der Server prüft MIME-Typ,
   Größe und Rate Limit, legt eine Medienzeile an und **bildet den Key selbst**.
   Ein Dateiname aus dem Browser kann Pfadtrenner, `..` oder Steuerzeichen
   enthalten und erreicht den Speicher nie.
2. Der Browser lädt die Bytes direkt hoch. Die Anwendung sieht die Datei nicht.
3. Der Client meldet den Abschluss; der Server holt das Original zurück, erzeugt
   mit `sharp` die WebP-Varianten und markiert die Zeile als verarbeitet.

Erst nach Schritt 3 taucht das Bild in der Bibliothek auf. Bricht die
Verarbeitung ab — etwa weil die Bytes gar kein Bild waren —, werden Zeile und
Objekte wieder entfernt. `sharp` ist damit die eigentliche Inhaltsprüfung: der
MIME-Typ ist nur die Behauptung des Clients.

### Der Objektspeicher braucht CORS

Weil der Browser direkt auf den Speicher schreibt, ist der Upload ein
Cross-Origin-Request mit Preflight. Ohne CORS-Konfiguration am Bucket scheitert
**jeder** Upload, bevor ein Byte fließt. `docker-compose.dev.yml` setzt dafür
`MINIO_API_CORS_ALLOW_ORIGIN`; in Produktion gehören dort die echten Origins der
Plattform und der Sites hinein, nicht `*`.

### Der SDK-Checksum muss aus

Der AWS-SDK hängt seit Kurzem standardmäßig eine CRC32-Prüfsumme an jede
Anfrage. Beim Signieren wird sie über einen leeren Body berechnet und passt
danach nicht zu dem, was der Browser wirklich hochlädt — S3-kompatible Speicher
wie MinIO antworten mit 403. Der Client ist deshalb auf
`requestChecksumCalculation: 'WHEN_REQUIRED'` gesetzt.

### Varianten und `srcset`

Drei Breiten (320, 800, 1600), durchgehend WebP. Hochskaliert wird nie: ein
1000 Pixel breites Original bleibt in jeder Variante 1000 Pixel breit, und der
`srcset` nennt dann auch 1000w statt 1600w — sonst würde der Browser über die
verfügbare Auflösung getäuscht. Doppelte Breiten fallen aus dem `srcset` heraus.

`srcset` und `sizes` stehen als Attribute am Bild-Node und landen beim Speichern
im gerenderten HTML. Die Sanitizing-Allow-List erlaubt sie deshalb explizit —
inklusive Schema-Prüfung für `srcset`, das `sanitize-html` von sich aus nicht
kontrolliert.

## Konsequenzen

- Ändern sich die Variantenbreiten, tragen bereits gespeicherte Beiträge weiter
  den alten `srcset`. Das HTML lässt sich aus `content_json` neu erzeugen.
- Das Löschen räumt den gesamten Präfix des Bildes auf, nicht nur einzelne
  Schlüssel. Zuerst der Speicher, dann die Zeile: ein übrig gebliebenes Objekt
  ohne Zeile ist unsichtbar, eine Zeile ohne Objekte wäre ein kaputtes Bild.
- Uploads sind pro Nutzer auf 20 je Minute begrenzt. Better Auth deckt nur seine
  eigenen Endpunkte ab, und ein Upload kostet eine presigned URL, einen Download
  und drei `sharp`-Läufe.
