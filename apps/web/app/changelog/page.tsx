import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app/AppHeader";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Changelog | Chessloom",
  description: "Product updates for the Chessloom opening trainer.",
};

const entries = [
  {
    date: "2026-09-11",
    title: "Path to 1,000 users — activation & growth foundations",
    items: [
      "Curated Lichess starter openings for beginners and club players",
      "Dashboard first-run checklist and share progress card",
      "Privacy, Terms, account deletion, due-email reminders (opt-out)",
      "SEO metadata, sitemap, help docs, and growth ritual guide",
    ],
  },
  {
    date: "2026-08-31",
    title: "Google OAuth reliability",
    items: [
      "Session cookies bound to auth callback redirects",
      "Client-side Google OAuth + stray ?code= forwarding",
    ],
  },
  {
    date: "2026-08-21",
    title: "Phase 3 polish",
    items: [
      "Named palettes, SAN paths, weak queues, landing upgrade, optional sound",
    ],
  },
] as const;

export default function ChangelogPage() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <PageTransition>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8">
          <p className="font-mono text-xs tracking-[0.18em] text-primary uppercase">
            Product
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Changelog
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Also see{" "}
            <a
              className="underline underline-offset-4"
              href="https://github.com/MindqueBlast/chessloom/releases"
            >
              GitHub Releases
            </a>
            .
          </p>

          <ol className="mt-10 space-y-10">
            {entries.map((entry) => (
              <li key={entry.date} className="space-y-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {entry.date}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">
                    {entry.title}
                  </h2>
                </div>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {entry.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <p className="mt-12 text-sm">
            <Link className="underline underline-offset-4" href="/docs">
              Help docs
            </Link>
          </p>
        </section>
      </PageTransition>
    </main>
  );
}
