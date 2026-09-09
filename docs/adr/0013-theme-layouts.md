# ADR 0013 — Themes bringen ein Layout mit

- **Status:** akzeptiert
- **Datum:** 2026-09-09

## Kontext

Bis hierher waren Themes reine Variablensätze: acht Farben, zwei Schriften,
eine Breite. Fünf Themes sahen deshalb aus wie fünf Anstriche derselben Seite —
dieselbe Trennlinienliste, dasselbe Bild rechts, derselbe Abstand. Wer sich
zwischen „Minimal" und „Ozean" entscheidet, entscheidet sich zwischen Grau und
Blau, nicht zwischen zwei Entwürfen.

Für drei neue Vorlagen (Atelier, Neo, Aurora) reicht das nicht. Ein Portfolio
braucht ein Raster mit großen Bildern, kein Textblog-Layout mit Vorschaubild;
ein plakatives Theme braucht harte Kanten dort, wo ein ruhiges runde Ecken hat.

## Entscheidung

### Das Layout ist ein Attribut, keine Verzweigung im Code

Jedes Theme trägt einen Layout-Namen (`list`, `grid`, `block`, `glass`). Das
Site-Layout schreibt ihn als `data-layout` an das Wurzelelement, und die Regeln
in `globals.css` hängen daran. Die Komponenten kennen ihn nicht: `PostList`
rendert für alle acht Themes dieselben Elemente.

Damit bleibt gültig, was schon für die Farben galt — ein Themewechsel ist ein
CSS-Wechsel. Kein gespeicherter Inhalt wird neu gerendert, kein Cache-Eintrag
ungültig, und ein neues Theme, das ein vorhandenes Layout wiederverwendet, ist
zehn Zeilen in einer Datei.

Die Alternative, je Layout eine eigene Komponente zu rendern, hätte den
Beitragslisten-Code verdreifacht und jedem Theme eigene Tests aufgebürdet.

Der Preis: Die Layoutregeln stehen nach den Grundregeln in derselben
Kaskadenschicht und gewinnen über die Reihenfolge, nicht über die Spezifität.
Sie gehören deshalb ans Ende von `globals.css`; ein Kommentar dort sagt das.
Ein Fehler dieser Art ist bereits aufgetreten: `.post-list-item.has-cover` setzt
für breite Fenster `align-items: start`, was im Raster die Bildbreite auf die
Eigenbreite zusammenzieht — das Rasterlayout setzt `stretch` ausdrücklich
zurück.

### Zwei Breiten statt einer

`contentWidth` galt für Kopfzeile, Listen und Artikel gleichermaßen. Ein Raster
braucht aber 72rem, ein Fließtext nicht mehr als 45rem. Themes nennen deshalb
`contentWidth` und `readingWidth`; die Leseweite begrenzt nur `.site-main >
article`, also Beitrag und Seite. Für die fünf bestehenden Themes sind beide
Werte gleich, ihr Aussehen ändert sich nicht.

### Dekoration aus den Tokens, keine festen Farben

Auch die neuen Effekte lesen ausschließlich `--site-*`: Der versetzte Schatten
von **Neo** nimmt die Randfarbe (deren Token dort auf Schwarz steht), die
Glaspaneele von **Aurora** mischen die gedämpfte Fläche mit Transparenz. Damit
wirken die Farbüberschreibungen einer Site auch in den neuen Themes.

Der zweite Farbschimmer von **Aurora** ist der Akzent, um 120° im Farbkreis
gedreht — `oklch(from var(--site-accent) … calc(h - 120))`. Das ist die einzige
Stelle mit relativer Farbsyntax. Sie steht in einer eigenen
`background-image`-Deklaration: Ein Browser, der sie nicht kennt, verwirft genau
diese Deklaration und zeigt die einfarbige Fläche.

## Konsequenzen

- Neue Themes ohne neues Layout kosten einen Eintrag in `THEMES` und einen im
  OG-Bild (`CARDS` ist über `Record<ThemeId, …>` erzwungen — der Typecheck
  erinnert daran).
- Die Vorschau im Design-Bereich zeichnet das Layout mit, sonst hätte die Karte
  für Atelier ausgesehen wie die für Minimal.
- `data-layout` ist getestet: Ein E2E-Test schaltet auf Atelier und prüft, dass
  die Liste tatsächlich als Raster berechnet wird — die Anordnung entsteht ja
  erst im Browser.
- Wer ein Layout ändert, ändert es für alle Themes, die es benutzen. Das ist
  gewollt; wer eine Ausnahme braucht, braucht ein eigenes Layout.
