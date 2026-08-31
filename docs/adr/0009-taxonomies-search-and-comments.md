# ADR 0009 — Taxonomien, Volltextsuche und Kommentare

- **Status:** akzeptiert
- **Datum:** 2026-08-31

## Kontext

Phase 6 bringt Kategorien und Tags, eine Suche pro Site und moderierte
Kommentare. Vier Punkte brauchen eine Festlegung.

## Entscheidungen

### Eine Kategorie, beliebig viele Tags

Das Datenmodell im Auftrag gibt Tags eine Verknüpfungstabelle (`post_tags`),
Kategorien aber nicht. Genau so ist es umgesetzt: `posts.category_id` als
optionaler Fremdschlüssel, Tags über die Join-Tabelle. Wird eine Kategorie
gelöscht, verlieren ihre Beiträge nur die Einordnung (`on delete set null`) —
Inhalte gehen bei einer Aufräumaktion nie verloren.

Tags entstehen beim Schreiben: was im Beitrag eingetragen wird, wird angelegt.
Das ist das Verhalten, das man von einem Tag-Feld erwartet. Ungenutzte Tags
lassen sich in der Verwaltung in einem Schritt entfernen.

### Suche über einen Ausdrucksindex

Gesucht wird mit `websearch_to_tsquery`, weil es das verkraftet, was Leute
tatsächlich eintippen — Anführungszeichen, `or`, ein führendes Minus — statt bei
ungültiger Syntax zu werfen.

Der Suchvektor steht **nicht** als Spalte in der Tabelle, sondern als Ausdruck
in einem GIN-Index über `title`, `excerpt` und `content_text`. Der Ausdruck in
`searchVector()` muss deshalb zeichengenau dem im Index entsprechen; sonst
nutzt Postgres den Index nicht. `content_text` wird beim Speichern aus dem
Editor-Dokument abgeleitet und bleibt so automatisch aktuell.

Die Site-Zugehörigkeit ist Teil der WHERE-Klausel. Eine Suche kann prinzipiell
nicht über Tenant-Grenzen hinausreichen; ein Test hält das fest.

### `ts_headline` muss sanitized werden

`ts_headline` liefert den **Originaltext** mit eingefügten Markierungen zurück —
es escaped nichts. Enthielte ein Beitrag Markup im Fließtext, würde es
ungefiltert auf der Ergebnisseite landen. Das Snippet wird deshalb serverseitig
auf genau das eine erlaubte Tag (`<mark>`) reduziert.

### Kommentare sind immer erst `pending`

Nichts, was ein Besucher absendet, wird ohne Freigabe öffentlich. Der Spam-Schutz
kommt ohne Drittanbieter aus:

- **Honeypot:** ein verstecktes Feld, das nur automatisierte Clients ausfüllen.
  Die Antwort ist identisch zur echten Absendung — ein Bot lernt nichts.
  Das Feld liegt außerhalb des Sichtbereichs statt auf `display: none`, damit
  auch ein Bot, der die berechnete Darstellung prüft, es ausfüllbar findet.
- **Rate Limit:** fünf Kommentare je zehn Minuten und Adresse. Adressen werden
  ausschließlich gehasht gespeichert — sie dienen der Begrenzung, nicht der
  Identifikation von Leserinnen und Lesern.
- **Heuristik:** Linkfarmen, URLs als Name, durchgehende Großschreibung landen
  direkt in der Spam-Queue. Sie werden dadurch nie veröffentlicht, sondern nur
  aus der Freigabeliste herausgehalten; ein Fehlurteil kostet einen Klick.

Kommentartexte werden als Text gerendert, nie als HTML.

## Konsequenzen

- Ein Kommentar durchläuft immer eine menschliche Entscheidung. Eine
  Auto-Freigabe gibt es bewusst nicht.
- Die Moderation braucht mindestens die Rolle Redaktion.
- Wächst eine Site stark, ist der Ausdrucksindex der erste Ort, an dem eine
  materialisierte `tsvector`-Spalte sinnvoll werden könnte. Bis dahin spart der
  Ausdruck eine Spalte, die konsistent gehalten werden müsste.
