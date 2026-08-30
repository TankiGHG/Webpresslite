# ADR 0006 — Speicherung und Sanitizing der Editor-Inhalte

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

Der Editor liefert ein TipTap-JSON-Dokument. Gespeichert werden laut Datenmodell
sowohl `content_json` als auch `content_html`. Damit stellt sich die Frage, wer
das HTML erzeugt — und ob dem Browser dabei zu trauen ist.

## Entscheidung

- Das HTML wird **ausschließlich serverseitig** erzeugt. Der Client schickt nur
  das JSON-Dokument; `updatePost` rendert daraus mit `generateHTML` und
  sanitized das Ergebnis. Ein Client kann kein HTML einliefern.
- Die Extension-Liste (`src/lib/editor/extensions.ts`) wird von Browser und
  Server geteilt. Liefen sie auseinander, sähe die veröffentlichte Seite anders
  aus als das, was die Autorin geschrieben hat.
- Sanitized wird gegen eine **Allow-List** genau der Tags und Attribute, die der
  Editor erzeugen kann. Alles andere wird verworfen, nicht escaped. Erlaubte
  Schemata sind `http`, `https` und `mailto`; Bilder nur `http`/`https`, damit
  keine `data:`-URLs eingeschleust werden. Jeder Link bekommt zwingend
  `rel="noopener noreferrer nofollow"` — ein Dokument kann sich davon nicht
  ausnehmen.
- `content_json` bleibt die Quelle der Wahrheit; `content_html` ist ein
  abgeleiteter Cache. Ändert sich die Sanitizing-Regel, lässt sich das HTML aus
  dem JSON neu erzeugen.

## Konsequenzen

- Neue Editor-Funktionen brauchen immer zwei Schritte: Extension ergänzen **und**
  Allow-List erweitern. Wird das zweite vergessen, verschwindet die Funktion
  still aus der Ausgabe — sichtbar, aber ungefährlich.
- `dangerouslySetInnerHTML` steht nur in `RenderedContent` und bekommt
  ausschließlich serverseitig sanitizetes HTML.

## Nachtrag: TipTap-Version

Der Auftrag fixiert TipTap v2. `pnpm add @tiptap/react` installiert v3.
Die Pakete sind bewusst auf `^2` gepinnt, inklusive `@tiptap/core` — ohne den
expliziten Pin löst pnpm den Peer von `@tiptap/react@2` auf einen bereits im
Store liegenden v3-Core auf, was zu unvereinbaren Typen führt.
