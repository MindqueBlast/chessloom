import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms | Chessloom",
  description: "Terms of use for the free Chessloom opening trainer.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-16 lg:px-8">
      <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Legal
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Terms</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: September 11, 2026
      </p>
      <div className="mt-8 space-y-4 text-sm leading-7 text-muted-foreground">
        <p>
          Chessloom is provided free of charge as open-source software,
          &quot;as is,&quot; without warranties of any kind.
        </p>
        <p>
          You are responsible for the repertoires you import, including ensuring
          you have the right to use any PGN or Lichess study content.
        </p>
        <p>
          Training feedback checks moves against your imported repertoire. The
          app does not invent opening theory with AI and does not guarantee OTB
          results.
        </p>
        <p>
          We may change or discontinue features. Continued use after changes
          means you accept the updated terms.
        </p>
        <p>
          Source code:{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/MindqueBlast/chessloom"
          >
            github.com/MindqueBlast/chessloom
          </a>
          .
        </p>
      </div>
      <p className="mt-10 text-sm">
        <Link className="underline underline-offset-4" href="/">
          Back to Chessloom
        </Link>
      </p>
    </main>
  );
}
