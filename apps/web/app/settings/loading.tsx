import { AppHeader } from "@/components/app/AppHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section
        className="mx-auto w-full max-w-3xl px-6 py-12 lg:px-8"
        aria-label="Loading settings"
        aria-busy="true"
      >
        <div className="mb-8 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-56" />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
