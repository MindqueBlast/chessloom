"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
        Something went wrong
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Chessloom hit an unexpected error.
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        You can try again, or return to your dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
