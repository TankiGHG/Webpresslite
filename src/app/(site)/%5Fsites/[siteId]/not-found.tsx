import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <div className="site-empty">
      <p className="post-meta">Fehler 404</p>
      <h1>Seite nicht gefunden</h1>
      <p>Diese Adresse gibt es hier nicht — vielleicht wurde der Beitrag umbenannt.</p>
      <p>
        <Link href="/">Zur Startseite</Link>
        <span className="dot" aria-hidden />
        <Link href="/archiv">Zum Archiv</Link>
        <span className="dot" aria-hidden />
        <Link href="/suche">Suchen</Link>
      </p>
    </div>
  );
}
