# ADR 0007 — Öffentliches Rendering, Themes und Metadaten

- **Status:** akzeptiert
- **Datum:** 2026-08-30

## Kontext

Phase 4 verlangt drei umschaltbare Themes, anpassbar über Farben, Schrift und
Logo — und Lighthouse ≥ 95 in Performance, SEO und Accessibility auf der
Beitragsseite. Drei Dinge sind dabei aufgefallen, die eine Festlegung brauchen.

## Entscheidungen

### Themes sind reine CSS-Variablen

Ein Theme ändert kein Markup, nur einen Satz `--site-*`-Variablen, den das
Site-Layout als `style` setzt. Vorteile: der Wechsel invalidiert keinen
gerenderten Inhalt, und die Anpassungen einer Site können nichts einschleusen —
`themeStyle` gibt ausschließlich bekannte Property-Namen aus, und jede Farbe ist
vorher gegen ein Hex-Muster validiert.

Die Farbpaare der drei Themes sind so gewählt, dass sie WCAG AA bei normaler
Textgröße erreichen. Das ist keine Kosmetik: der Accessibility-Score hängt daran.

### OG-Images liegen auf einem eigenen Pfad

Next erzeugt aus einer `opengraph-image.tsx` eine URL, die vom internen
Routing-Ziel abgeleitet ist — bei uns also `/_sites/<siteId>/…` auf der
falschen Host-Adresse. Crawler bekämen einen 404. Das Bild wird deshalb von
einem gewöhnlichen Route Handler unter `/og/beitrag/<slug>` ausgeliefert, dessen
URL wir selbst bestimmen.

### Metadaten werden nicht gestreamt

Next streamt Metadaten in den Body und lässt React sie zur Laufzeit in den Head
heben. Blockierend gerendert wird nur für User-Agents auf einer fest
verdrahteten Bot-Liste. Jeder Crawler außerhalb dieser Liste — und jedes
Vorschau- oder Archivierungswerkzeug — bekommt ein Dokument mit leerem `<head>`.

Für eine Publishing-Plattform ist das die falsche Vorgabe. `htmlLimitedBots` ist
deshalb auf `/.*/ ` gesetzt: Metadaten stehen für alle im initialen Head. Da sie
aus denselben gecachten Queries stammen wie die Seite selbst, kostet das
praktisch nichts — die gemessene Performance blieb bei 99.

## Konsequenzen

- Ein neues Theme heißt: Eintrag in `THEMES`, sonst nichts.
- Die `--site-*`-Variablen sind die Schnittstelle zwischen Theme und Stylesheet.
  Wer im Site-Bereich eine Farbe hart notiert, bricht die Theme-Umschaltung.
- `pnpm lighthouse` prüft Startseite, Beitrag und Archiv gegen den Schwellwert 95. `best-practices` wird berichtet, aber nicht erzwungen: die Kategorie
  scheitert lokal zwangsläufig an `is-on-https`, weil ohne TLS gemessen wird.
