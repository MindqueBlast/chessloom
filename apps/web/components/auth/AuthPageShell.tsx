import Link from "next/link";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-12">
      <div className="flex w-full flex-col items-center gap-8">
        <Link
          className="font-mono text-sm font-semibold tracking-[0.18em] uppercase"
          href="/"
        >
          Chessloom
        </Link>
        {children}
      </div>
    </main>
  );
}
