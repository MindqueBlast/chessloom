import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Chessloom",
  description: "How Chessloom handles account and training data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-16 lg:px-8">
      <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Legal
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: September 11, 2026
      </p>
      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-4 text-sm leading-7 text-muted-foreground">
        <p>
          Chessloom is a free, open-source opening trainer. We store the minimum
          data needed to run the product.
        </p>
        <h2 className="text-lg font-semibold text-foreground">What we store</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Account email and auth identifiers (via Supabase Auth).</li>
          <li>
            Studies, PGN content, training progress, and preferences you create.
          </li>
          <li>
            Optional product analytics events (for example signup and first
            training session) when analytics keys are configured.
          </li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">What we do not do</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>We do not sell personal data.</li>
          <li>We do not use your repertoire to train public AI models.</li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">Your controls</h2>
        <p>
          You can opt out of due reminder emails in Settings, and permanently
          delete your account from Settings. Deletion removes your auth user and
          cascaded study data held in Chessloom&apos;s database.
        </p>
        <p>
          Questions: open an issue on{" "}
          <a
            className="underline underline-offset-4"
            href="https://github.com/MindqueBlast/chessloom/issues"
          >
            GitHub
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
