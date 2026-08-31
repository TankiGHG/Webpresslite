# ADR 0010 — Rollen, Pläne, Custom Domains und Statistik

- **Status:** akzeptiert
- **Datum:** 2026-08-31

## Kontext

Phase 7 bringt Team-Einladungen, eine Berechtigungsmatrix, Reichweitenzahlen,
Custom Domains und Plan-Limits. Fünf Punkte brauchen eine Festlegung.

## Entscheidungen

### Die Matrix wird ausgeschrieben, nicht abgeleitet

Bis Phase 6 wurde über `roleAtLeast(role, 'editor')` geprüft. Eine Rangfolge
beantwortet aber nur „ist diese Rolle mindestens X" — nicht „darf die Redaktion
das Theme ändern". `src/lib/sites/permissions.ts` schreibt deshalb jede
Berechtigung aus. Das ist lesbar, greppbar und testbar, und eine neu ergänzte
Berechtigung erbt nichts, was ihr niemand gegeben hat.

Die Matrix steht zusätzlich auf der Team-Seite: wer Rollen vergibt, soll
nachlesen können, was er vergibt.

Geprüft wird an zwei Stellen — die Seite blendet aus, was die Rolle nicht darf,
und die Query-Schicht wirft. Das UI ist Bequemlichkeit, die Query ist die
Durchsetzung.

### Einladungen sind an die Adresse gebunden

Der Token steht nur in der Mail; gespeichert wird sein Hash. Eingelöst werden
kann eine Einladung ausschließlich mit einem Konto, dessen Adresse der
eingeladenen entspricht — sonst würde eine weitergeleitete Mail Zugang an die
falsche Person geben. Offene Einladungen belegen einen Platz, sonst ließe sich
das Mitglieder-Limit durch Masseneinladungen überschreiten.

Niemand kann eine Rolle vergeben, die er selbst nicht hat: `assignableRoles`
gibt einer Administration Redaktion und Autor:in, einer Redaktion nichts. Die
Rolle der Eigentümerin ist über die Mitgliederliste weder änderbar noch
entfernbar.

### Es gibt kein Limit für Sites pro Konto

Der Plan hängt laut Datenmodell an der **Site**. Eine Site, die es noch nicht
gibt, hat keinen Plan — ein Konto-Limit müsste also gegen eine fest verdrahtete
Stufe prüfen, und jemand mit drei Pro-Sites könnte keine vierte anlegen. Die
vier verbleibenden Limits (Inhalte, Medien, Mitglieder, eigene Domain) sind alle
pro Site und lesen den Plan der Site selbst.

Abgerechnet wird nichts. `src/lib/billing/stub.ts` ist die einzige Naht, an der
ein echter Anbieter einsteigen würde.

### Eine Domain wird erst nach Verifizierung ausgeliefert

`findSiteByHost` verlangt für Custom Domains `domain_verified_at IS NOT NULL`.
Ohne diese Bedingung könnte jemand einen beliebigen Hostnamen auf die Plattform
zeigen lassen und bekäme fremde Inhalte serviert.

Der Nachweis läuft über einen TXT-Eintrag auf `_webpresslite.<domain>` — ein
eigener Name, damit er sich nicht mit SPF oder anderen Verifizierungen ins
Gehege kommt. Der Wert trägt ein Präfix, damit ein unbeteiligter TXT-Wert nicht
zufällig passt. Der Resolver ist ein Parameter, nicht ein Modul-Import: so ist
die Abgleich-Logik ohne Netzzugriff testbar, inklusive der Fälle, in denen DNS
einen langen Wert in mehrere Strings zerlegt.

### Views werden beim Schreiben aggregiert

Eine Zeile je Site, Beitrag und Tag, per Upsert hochgezählt. Es gibt keine
Roh-Events: die Plattform hält damit keine Spur darüber, wer was gelesen hat,
und die Tabelle bleibt klein genug, dass die Charts eine einfache Abfrage sind.

`post_id` ist für Aufrufe der Site selbst `null`. Ein Primärschlüssel kann keine
Null enthalten, deshalb sichert ein `UNIQUE ... NULLS NOT DISTINCT` (Postgres 15+)
die Kombination — damit kollidieren die Null-Zeilen miteinander, was der Upsert
genau braucht. Gezählt wird in `after()`, also nachdem die Antwort raus ist.

## Konsequenzen

- Eine neue Berechtigung braucht einen Eintrag in `CAPABILITIES`, ein Label und
  eine Zeile in der Rollenzuordnung. Der Test hält fest, dass die Matrix
  kumulativ bleibt.
- Die Zahlen sind Aufrufe, nicht Besucher: ohne Roh-Events lässt sich nicht
  entdoppeln. Das ist der Preis dafür, nichts über einzelne Leser zu speichern.
- Wird eine Domain geändert, verfällt ihre Verifizierung. Das ist Absicht.
