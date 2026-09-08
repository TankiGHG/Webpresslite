import {
  ArrowRight,
  BarChart3,
  Feather,
  Globe,
  ImageIcon,
  MessageSquare,
  Palette,
  Rss,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark, Wordmark } from '@/components/brand/logo';
import { ThemePreview } from '@/components/themes/theme-preview';
import { Button } from '@/components/ui/button';
import { getSessionContext } from '@/lib/auth/session';
import { getEnv } from '@/lib/env';
import { THEME_IDS, THEMES } from '@/lib/themes/definitions';

const REPO_URL = 'https://github.com/TankiGHG/Webpresslite';

const FEATURES: { icon: typeof Feather; title: string; text: string }[] = [
  {
    icon: Feather,
    title: 'Editor ohne Ablenkung',
    text: 'Überschriften, Bilder, Zitate, Code. Entwürfe speichern sich von selbst — auch bei Strg+S.',
  },
  {
    icon: Palette,
    title: 'Fünf Themes, deine Farben',
    text: 'Wähle ein Theme und überschreibe Akzent, Hintergrund, Schrift und Logo. Ohne CSS.',
  },
  {
    icon: Globe,
    title: 'Eigene Domain',
    text: 'Deine Site läuft sofort auf einer Subdomain. Eine eigene Domain bindest du per TXT-Eintrag an.',
  },
  {
    icon: Users,
    title: 'Team & Rollen',
    text: 'Lade Redaktion und Autorinnen ein. Wer veröffentlichen darf, entscheidet die Rolle.',
  },
  {
    icon: MessageSquare,
    title: 'Kommentare mit Moderation',
    text: 'Leser kommentieren, du gibst frei. Spam landet in seiner eigenen Liste, nicht bei dir.',
  },
  {
    icon: BarChart3,
    title: 'Statistik ohne Tracking',
    text: 'Aufrufe pro Tag und meistgelesene Beiträge — aggregiert, ohne Cookies, ohne Roh-Events.',
  },
  {
    icon: ImageIcon,
    title: 'Medien mit Varianten',
    text: 'Bilder werden beim Upload in passende Größen gerechnet und mit Alt-Text ausgeliefert.',
  },
  {
    icon: Rss,
    title: 'SEO, RSS & Sitemap',
    text: 'Open-Graph-Bilder, strukturierte Daten, Feed und Sitemap — alles ohne Zutun.',
  },
];

const STEPS = [
  { title: 'Konto anlegen', text: 'E-Mail, Passwort, fertig. Keine Kreditkarte, kein Formular.' },
  { title: 'Site benennen', text: 'Name wählen — die Subdomain steht in Sekunden bereit.' },
  { title: 'Schreiben', text: 'Erster Beitrag, ein Klick auf Veröffentlichen, live.' },
];

function EditorMock({ rootDomain }: { rootDomain: string }) {
  return (
    <div
      aria-hidden
      className="bg-card overflow-hidden rounded-2xl border text-left shadow-[0_30px_80px_-30px_oklch(0.3_0.1_277/0.45)]"
    >
      <div className="text-muted-foreground flex items-center gap-2 border-b px-4 py-2.5 text-xs">
        <span className="flex gap-1.5">
          <span className="bg-danger/70 size-2.5 rounded-full" />
          <span className="bg-warning/70 size-2.5 rounded-full" />
          <span className="bg-success/70 size-2.5 rounded-full" />
        </span>
        <span className="ml-3 truncate">meine-site.{rootDomain} / Beitrag bearbeiten</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="bg-success size-1.5 rounded-full" />
          Gespeichert
        </span>
      </div>
      <div className="grid sm:grid-cols-[1fr_11rem]">
        <div className="space-y-4 px-6 py-7 sm:px-8">
          <p className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Warum ich wieder ein Blog habe
          </p>
          <div className="space-y-2.5">
            <div className="bg-muted h-2 w-full rounded-full" />
            <div className="bg-muted h-2 w-11/12 rounded-full" />
            <div className="bg-muted h-2 w-4/5 rounded-full" />
          </div>
          <div className="h-24 rounded-lg bg-[linear-gradient(135deg,oklch(0.9_0.05_277),oklch(0.85_0.08_300))]" />
          <div className="space-y-2.5">
            <div className="bg-muted h-2 w-10/12 rounded-full" />
            <div className="bg-muted h-2 w-full rounded-full" />
            <div className="bg-muted h-2 w-2/3 rounded-full" />
          </div>
        </div>
        <div className="bg-background/60 hidden border-l p-4 text-xs sm:block">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="bg-warning-soft text-warning rounded-full px-2 py-0.5 font-medium">
                Entwurf
              </span>
            </div>
            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-center font-medium">
              Veröffentlichen
            </div>
            <div className="space-y-1.5 border-t pt-3">
              <span className="text-muted-foreground">Kategorie</span>
              <div className="rounded-md border px-2 py-1.5">Notizen</div>
            </div>
            <div className="space-y-1.5">
              <span className="text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-1">
                {['schreiben', 'indieweb'].map((tag) => (
                  <span key={tag} className="bg-muted rounded-full px-2 py-0.5">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  text,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-20 sm:py-24">
      <div className="app-container">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-medium">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 text-base">{text}</p>
        </div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const context = await getSessionContext();
  const rootDomain = getEnv().ROOT_DOMAIN;

  const primaryCta = context ? (
    <Button asChild size="lg">
      <Link href="/dashboard">
        Zum Dashboard
        <ArrowRight />
      </Link>
    </Button>
  ) : (
    <Button asChild size="lg">
      <Link href="/register">
        Konto anlegen
        <ArrowRight />
      </Link>
    </Button>
  );

  return (
    <div className="bg-background min-h-dvh">
      <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur">
        <div className="app-container flex h-14 items-center gap-6">
          <Logo />
          <nav className="text-muted-foreground hidden items-center gap-5 text-sm sm:flex">
            <a href="#funktionen" className="hover:text-foreground">
              Funktionen
            </a>
            <a href="#themes" className="hover:text-foreground">
              Themes
            </a>
            <a href="#selbst-hosten" className="hover:text-foreground">
              Selbst hosten
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {context ? (
              <Button asChild size="sm">
                <Link href="/dashboard">Zum Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Anmelden</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Konto anlegen</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50rem_30rem_at_50%_-10%,oklch(0.6_0.18_277/0.18),transparent_65%)]"
          />
          <div className="app-container relative pt-20 pb-16 text-center sm:pt-28">
            <p className="bg-card text-muted-foreground mx-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <span className="bg-success size-1.5 rounded-full" />
              Open Source · selbst gehostet · ohne Tracking
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Ein Blog, der dir gehört.
            </h1>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg text-pretty">
              webpresslite ist die Publishing-Plattform für Menschen, die schreiben wollen statt
              Plugins zu pflegen. Eigene Adresse, eigenes Design, eigener Server.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {primaryCta}
              <Button asChild variant="outline" size="lg">
                <a href={REPO_URL} rel="noreferrer">
                  Quellcode auf GitHub
                </a>
              </Button>
            </div>
            <div className="mx-auto mt-16 max-w-4xl">
              <EditorMock rootDomain={rootDomain} />
            </div>
          </div>
        </section>

        <Section
          id="funktionen"
          eyebrow="Funktionen"
          title="Alles, was ein Blog braucht. Nichts, was es nicht braucht."
          text="Kein Plugin-Zoo, keine Theme-Updates, keine Sicherheitslücken von Drittanbietern. Die Kernfunktionen sind eingebaut und werden gemeinsam gepflegt."
        >
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-card rounded-xl border p-5 shadow-[var(--shadow-card)]">
                <span className="bg-primary-soft text-primary-soft-foreground flex size-9 items-center justify-center rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">{text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <div className="bg-muted/40 border-y">
          <Section
            id="themes"
            eyebrow="Themes"
            title="Fünf Ausgangspunkte, unendlich viele Sites."
            text="Jedes Theme ist ein Satz Farben und Schriften. Akzentfarbe, Hintergrund, Text und Logo passt du im Dashboard an — die Vorschau reagiert sofort."
          >
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {THEME_IDS.map((id) => {
                const theme = THEMES[id];
                return (
                  <li key={id} className="space-y-3">
                    <div className="[&_p]:text-[0.85rem] [&>div]:text-[0.55rem]">
                      <ThemePreview theme={theme} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{theme.name}</p>
                      <p className="text-muted-foreground text-xs">{theme.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <Section
          id="start"
          eyebrow="So geht's"
          title="In drei Minuten online."
          text="Vom leeren Konto zum ersten veröffentlichten Beitrag braucht es genau drei Schritte."
        >
          <ol className="grid gap-5 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="bg-card relative rounded-xl border p-5 pl-16">
                <span className="bg-primary text-primary-foreground absolute top-5 left-5 flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums">
                  {index + 1}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{step.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <section id="selbst-hosten" className="scroll-mt-20 pb-24">
          <div className="app-container">
            <div className="relative overflow-hidden rounded-2xl bg-[oklch(0.22_0.05_277)] px-6 py-12 text-white sm:px-12 sm:py-16">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_25rem_at_100%_0%,oklch(0.55_0.2_277/0.5),transparent_60%)]"
              />
              <div className="relative grid gap-10 lg:grid-cols-[3fr_2fr] lg:items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LogoMark className="size-7" />
                    <Wordmark className="text-white [&_span]:text-[oklch(0.85_0.1_277)]" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                    Läuft auf deinem Server. Oder auf diesem.
                  </h2>
                  <p className="max-w-xl text-white/75">
                    Ein Container, eine Postgres-Datenbank, ein S3-Bucket. Der komplette Code liegt
                    offen auf GitHub — Mitarbeit, Forks und Issues ausdrücklich erwünscht.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button asChild variant="secondary" size="lg">
                      <a href={REPO_URL} rel="noreferrer">
                        Zum Repository
                      </a>
                    </Button>
                    {context ? null : (
                      <Button
                        asChild
                        variant="ghost"
                        size="lg"
                        className="text-white hover:bg-white/10 hover:text-white"
                      >
                        <Link href="/register">Hier direkt loslegen</Link>
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-5 text-xs leading-relaxed text-white/85">
                  <code>{`git clone ${REPO_URL}.git
cd Webpresslite
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-muted-foreground border-t py-8 text-sm">
        <div className="app-container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <nav className="flex flex-wrap gap-5">
            <a href={REPO_URL} rel="noreferrer" className="hover:text-foreground">
              GitHub
            </a>
            {context ? (
              <Link href="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-foreground">
                  Anmelden
                </Link>
                <Link href="/register" className="hover:text-foreground">
                  Konto anlegen
                </Link>
              </>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
