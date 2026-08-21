import { LandingHero } from "@/components/landing/LandingHero";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="min-h-svh bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-8 lg:px-8">
        <span className="font-mono text-sm font-semibold tracking-[0.18em] uppercase">
          Chessloom
        </span>
      </header>

      <Separator />

      <LandingHero />
      <Separator />
      <LandingShowcase />

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground lg:px-8">
        <span className="font-mono text-xs tracking-[0.16em] uppercase">
          Chessloom
        </span>
        <a
          href="/signup"
          className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Create an account
        </a>
      </footer>
    </main>
  );
}
