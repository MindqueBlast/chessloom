import Link from "next/link";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AppHeader() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-5 lg:px-8">
        <Link
          className="font-mono text-sm font-semibold tracking-[0.18em] uppercase"
          href="/dashboard"
        >
          Chessloom
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account">
          <Button asChild variant="ghost">
            <Link href="/settings">Settings</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </nav>
      </header>
      <Separator />
    </>
  );
}
