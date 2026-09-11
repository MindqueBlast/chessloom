import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app/AppHeader";
import { PageTransition } from "@/components/motion/PageTransition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help | Chessloom",
  description: "How Learn, Practice, and Test modes differ in Chessloom.",
};

const modes = [
  {
    title: "Learn",
    body: "Guided walkthrough of your repertoire. Play the expected moves; opponent replies follow your study. Best for building familiarity.",
  },
  {
    title: "Practice",
    body: "Recall mode with spaced review. Positions become due based on FSRS. Wrong moves stay on the card until you get them right or reveal.",
  },
  {
    title: "Test",
    body: "Exam-style runs: Random Test samples N cards, Full Repertoire walks the whole tree. Use after Learn/Practice to measure retention.",
  },
] as const;

export default function DocsPage() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <PageTransition>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8">
          <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
            Help
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Learn vs Practice vs Test
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Chessloom quizzes <em>your</em> repertoire — it never invents moves
            with AI.
          </p>

          <div className="mt-8 space-y-4">
            {modes.map((mode) => (
              <Card key={mode.title}>
                <CardHeader>
                  <CardTitle>{mode.title}</CardTitle>
                  <CardDescription>{mode.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Pick a curated Lichess opening or import your own study.</p>
              <p>2. Run Learn until the first lines feel natural.</p>
              <p>3. Return for due Practice cards and occasional Tests.</p>
              <p>
                <Link className="underline underline-offset-4" href="/import">
                  Start with an opening
                </Link>
                {" · "}
                <Link className="underline underline-offset-4" href="/changelog">
                  Changelog
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </PageTransition>
    </main>
  );
}
