import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">webpresslite</h1>
        <p className="text-muted-foreground text-sm">
          Fundament steht. Auth, Sites und Editor folgen in den nächsten Phasen.
        </p>
      </div>
      <div>
        <Button asChild>
          <a href="/api/health">Systemstatus ansehen</a>
        </Button>
      </div>
    </main>
  );
}
