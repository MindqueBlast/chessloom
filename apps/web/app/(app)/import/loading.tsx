import { AppHeader } from "@/components/app/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function ImportLoading() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section
        className="mx-auto w-full max-w-3xl space-y-6 px-6 py-12 lg:px-8"
        aria-busy="true"
        aria-label="Loading import"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-10 w-36" />
      </section>
    </main>
  );
}
