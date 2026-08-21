"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function NavLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button asChild variant="ghost">
        <Link href="/import">Import PGN</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href="/settings">Settings</Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}

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
        <nav className="hidden items-center gap-2 sm:flex" aria-label="Account">
          <NavLinks className="flex items-center gap-2" />
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="sm:hidden"
              aria-label="Open menu"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(100%,20rem)]">
            <SheetHeader>
              <SheetTitle className="font-mono text-sm tracking-[0.18em] uppercase">
                Chessloom
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-2" aria-label="Account">
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/import">Import PGN</Link>
                </Button>
              </SheetClose>
              <SheetClose asChild>
                <Button asChild variant="ghost" className="justify-start">
                  <Link href="/settings">Settings</Link>
                </Button>
              </SheetClose>
              <form action={signOut}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign out
                </Button>
              </form>
            </nav>
          </SheetContent>
        </Sheet>
      </header>
      <Separator />
    </>
  );
}
