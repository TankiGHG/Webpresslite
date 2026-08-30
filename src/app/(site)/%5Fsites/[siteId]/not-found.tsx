import Link from 'next/link';

export default function SiteNotFound() {
  return (
    <div className="space-y-4">
      <h1 className="post-header">Seite nicht gefunden</h1>
      <p>Diese Adresse gibt es hier nicht — vielleicht wurde der Beitrag umbenannt.</p>
      <p>
        <Link href="/">Zur Startseite</Link> · <Link href="/archiv">Zum Archiv</Link>
      </p>
    </div>
  );
}
