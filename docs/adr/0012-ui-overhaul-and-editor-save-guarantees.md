# ADR 0012 — Oberfläche, Designsystem und Speichergarantien des Editors

- **Status:** akzeptiert
- **Datum:** 2026-09-08

## Kontext

Bis Phase 8 war die Oberfläche funktional, aber roh: ein Kopfbalken mit
Links, Formulare ohne Rückmeldung, Seiten ohne Leerzustände, drei Themes mit
identischem Layout. Für eine Plattform, die gegen gehostetes WordPress antreten
will, reicht das nicht — die erste Minute entscheidet, ob jemand bleibt.

Die Überarbeitung betrifft Dashboard, Site-Bereich, Editor, Auth-Seiten,
Landingpage und das öffentliche Rendering. Sie bringt keine neuen Fachfunktionen
außer dem Untertitel einer Site (Migration 0008) und der Seitenliste als
eigener Bereich. Vier Festlegungen haben Tragweite über das Sichtbare hinaus.

## Entscheidungen

### Ein Designsystem im Repository, kein Komponentenpaket

`src/components/ui/` enthält die Grundbausteine (Button, Card, Badge, Dialog,
Dropdown, Popover, Tabs, Tooltip, Select, Empty State, Page Header …). Sie
folgen dem shadcn-Muster: Radix-Primitive für Verhalten und Barrierefreiheit,
Tailwind für das Aussehen, der Code liegt im Projekt und darf geändert werden.

Alle Farben sind Tokens in `globals.css` (`--color-primary`, `--color-muted`,
`--color-sidebar` …) in oklch, mit einem dunklen Satz unter
`[data-theme="dark"]`. Der Farbmodus wird per Inline-Skript vor dem ersten
Paint gesetzt (`ThemeScript`, mit CSP-Nonce), damit nichts flackert; die
Präferenz liegt in `localStorage`, Standard ist die Systemeinstellung.

Schrift ist Geist (Sans und Mono) über `next/font` — selbst gehostet, kein
Request an Dritte. Das gilt nur für die Plattform; öffentliche Sites nutzen
weiterhin Systemschriften, weil dort nichts nachgeladen und nichts getrackt
werden soll.

### Zwei Layouts im Site-Bereich: Shell und Editor

`app/(platform)/sites/[siteId]/` teilt sich in `(shell)` und `(editor)`.
Die Shell trägt Seitenleiste mit Site-Wechsler, Navigation nach Bereichen
(Inhalte / Site) und Nutzermenü; auf schmalen Bildschirmen wird sie zum
Dialog. Der Editor läuft **ohne** Seitenleiste in voller Breite — Schreiben
braucht Platz, und die Navigation lenkt ab. Der Rückweg ist der Link zur
Beitragsliste oben links.

Das Sidebar-Logo und das Logo im mobilen Kopf sind dieselbe Komponente. Der
Verlauf im Zeichen bekommt deshalb eine Instanz-ID über `useId()`: eine feste
ID zeigt auf die erste Kopie im DOM, und wenn die `display:none` ist, verliert
die zweite ihre Füllung — ein Fehler, der nur auf dem Handy auffällt.

### Fünf Themes, die sich im Layout unterscheiden, nicht nur in der Farbe

**Minimal**, **Journal**, **Editorial**, **Ozean**, **Kontrast**. Jedes ist
weiterhin ein Satz `--site-*`-Variablen, aber die Definition trägt jetzt auch
Schriftpaarung und Akzentführung, und die Design-Seite zeigt je Theme eine
gerenderte Miniatur statt eines Farbfelds. Wer ein Theme wählt, sieht vorher,
was er bekommt.

Die Farbfelder auf der Design-Seite verstecken das native `<input type="color">`
hinter einem eigenen Swatch: die Theme-Farben sind oklch, und ein natives
Farbfeld kann sie nicht darstellen — es zeigte schwarz, obwohl das Theme
blau war.

### Der Editor verliert nie Text — auch nicht beim Veröffentlichen

Autosave mit 1,5 s Verzögerung bleibt, bekommt aber drei Garantien:

1. **Speichern ist serialisiert.** Während ein Schreibvorgang läuft, wird eine
   weitere Änderung gemerkt und danach geschrieben. Zwei Requests können nicht
   mehr um die Reihenfolge wetteifern, sodass der ältere gewinnt.
2. **Jede Aktion im Seitenpanel wartet auf den Stand.** Veröffentlichen,
   Planen, Zurückziehen, Löschen: ein Submit-Listener in der Capture-Phase
   hält das Formular an, wenn Text ungespeichert ist, schreibt ihn und reicht
   das Submit dann mit demselben Button weiter. Ohne das ging eine Sekunde
   Tipparbeit verloren, wenn man direkt nach dem letzten Wort auf
   „Jetzt veröffentlichen" klickte.
3. **Navigation im Editor wartet ebenfalls.** Zurück zur Liste und Vorschau
   speichern zuerst; `beforeunload` warnt nur noch bei echtem Verlust.

Eine Falle dabei: TipTap bindet `onUpdate` einmal bei der Erzeugung, ein
späteres `setOptions` tauscht den Callback nicht. Die Komponente liest den
Callback deshalb über eine Ref, und der Editor hält den aktuellen Entwurf
(Titel + Inhalt) ebenfalls in einer Ref, damit ein Speichern nach einer
Titeländerung nicht den alten Titel schreibt.

Der Auszug eines Beitrags wird beim Speichern serverseitig aus den ersten
Sätzen abgeleitet, solange niemand einen eigenen eingetragen hat. Die
Beitragsseite zeigt ihn nur dann als Vorspann, wenn er von Hand geschrieben
wurde — sonst stünde der erste Absatz zweimal untereinander.

## Konsequenzen

- Der Site-Bereich hat eine URL-Struktur mehr (`(shell)`/`(editor)` sind
  Route Groups, die Pfade bleiben gleich). Ein neuer Bereich landet unter
  `(shell)` und bekommt automatisch Seitenleiste und Kopf.
- Neue Farben gehören als Token nach `globals.css`, nicht als Hex-Wert in
  eine Komponente — sonst gibt es sie im dunklen Modus nicht.
- Die E2E-Tests kennen die Oberfläche über `data-testid` und über
  Rollen/Labels, nicht über Klassen. Eine optische Änderung darf keinen Test
  brechen; ein Test, der bricht, hat ein Verhalten gefunden.
- `HOSTNAME` des Servers muss `0.0.0.0` (Produktion) oder `localhost` sein,
  nicht `127.0.0.1`: mit `127.0.0.1` schreibt die Middleware Tenant-Anfragen
  doppelt um und liefert 404. Das steht in der Betriebsdokumentation.
- Die Statistik zeigt bei null Aufrufen einen benannten Leerzustand statt
  einer leeren Fläche; die Suche rahmt Textausschnitte mit Auslassungspunkten,
  wenn sie mitten im Satz beginnen oder enden.
