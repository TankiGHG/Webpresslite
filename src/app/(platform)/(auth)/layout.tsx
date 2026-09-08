import { Feather, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo, LogoMark, Wordmark } from '@/components/brand/logo';
import { redirectIfAuthenticated } from '@/lib/auth/session';

const POINTS = [
  { icon: Feather, text: 'Schreiben ohne Ablenkung — Entwürfe speichern sich von selbst.' },
  { icon: Globe, text: 'Eigene Subdomain in Sekunden, eigene Domain wenn du willst.' },
  { icon: ShieldCheck, text: 'Open Source, ohne Tracking, auf deinem eigenen Server.' },
];

export default async function AuthLayout({ children }: { children: ReactNode }) {
  await redirectIfAuthenticated();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[oklch(0.22_0.05_277)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_-10%_-10%,oklch(0.55_0.2_277/0.55),transparent_60%),radial-gradient(40rem_30rem_at_110%_110%,oklch(0.7_0.15_300/0.35),transparent_60%)]"
        />
        <div className="relative flex items-center gap-2">
          <LogoMark className="size-8" />
          <Wordmark className="text-lg text-white [&_span]:text-[oklch(0.85_0.1_277)]" />
        </div>

        <div className="relative max-w-md space-y-8">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            Deine Texte, deine Adresse, dein Server.
          </h2>
          <ul className="space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm/6 text-white/80">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/10">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          webpresslite ist freie Software.{' '}
          <a
            href="https://github.com/TankiGHG/Webpresslite"
            className="underline underline-offset-4 hover:text-white/80"
            rel="noreferrer"
          >
            Quellcode auf GitHub
          </a>
        </p>
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
        <p className="text-muted-foreground text-center text-xs lg:text-left">
          <Link href="/" className="hover:text-foreground">
            Zur Startseite
          </Link>
        </p>
      </main>
    </div>
  );
}
