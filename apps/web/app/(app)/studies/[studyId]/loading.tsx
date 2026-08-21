import { AppHeader } from "@/components/app/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudyLoading() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section
        className="mx-auto w-full max-w-6xl space-y-6 px-6 py-12 lg:px-8"
        aria-busy="true"
        aria-label="Loading study"
      >
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-56" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </section>
    </main>
  );
}
