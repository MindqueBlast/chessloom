import type { Metadata } from "next";

import { AppHeader } from "@/components/app/AppHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard | Chessloom",
};

export default function DashboardPage() {
  return (
    <main className="min-h-svh bg-background">
      <AppHeader />
      <section className="mx-auto w-full max-w-6xl px-6 py-12 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Your repertoire</CardTitle>
            <CardDescription>
              Your studies and training activity will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create your first study to start weaving your opening knowledge.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
