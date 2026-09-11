import Link from "next/link";

import { LandingAbout } from "@/components/landing/LandingAbout";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="min-h-svh bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-8 lg:px-8">
        <span className="font-mono text-sm font-semibold tracking-[0.18em] uppercase">
          Chessloom
        </span>
        <nav className="flex items-center gap-2" aria-label="Landing">
          <Button asChild variant="ghost" size="sm">
            <a href="#why">Why Chessloom?</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <Separator />

      <LandingHero />
      <Separator />
      <LandingShowcase />
      <Separator />
      <LandingAbout />

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground lg:px-8">
        <span className="font-mono text-xs tracking-[0.16em] uppercase">
          Chessloom
        </span>
        <div className="flex flex-wrap gap-4">
          <a
            href="#why"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Why Chessloom?
          </a>
          <Link
            href="/docs"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Help
          </Link>
          <Link
            href="/changelog"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Changelog
          </Link>
          <Link
            href="/privacy"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Terms
          </Link>
          <Link
            href="/signup?starter=italian-beginner"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Create an account
          </Link>
        </div>
      </footer>
    </main>
  );
}
