import { AppHeader } from "@/components/app/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section
        className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8"
        aria-label="Loading dashboard"
        aria-busy="true"
      >
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="mb-10 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-3">
                <Skeleton className="size-5" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-9 w-14" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="mb-4 h-6 w-20" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index}>
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-28" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
