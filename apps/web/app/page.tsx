import { ArrowRight, Network, Repeat2, Target } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="min-h-svh bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center px-6 py-8 lg:px-8">
        <span className="font-mono text-sm font-semibold tracking-[0.18em] uppercase">
          Chessloom
        </span>
      </header>

      <Separator />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
        <div className="flex flex-col items-start gap-7">
          <Badge variant="outline">Repertoire intelligence</Badge>
          <div className="flex flex-col gap-5">
            <h1 className="max-w-3xl text-5xl leading-[0.96] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
              Weave opening knowledge into instinct.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Build a living repertoire, understand every branch, and train the
              positions that need your attention.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">
              Start building
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <Card className="bg-card/80">
          <CardHeader>
            <CardDescription className="font-mono text-xs tracking-[0.16em] uppercase">
              Training system
            </CardDescription>
            <CardTitle className="text-2xl">
              Your repertoire, connected.
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <Network className="mt-0.5 text-primary" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Map every variation</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Turn imported games into a navigable opening tree.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
              <Target className="mt-0.5 text-primary" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Practice the right lines</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Focus sessions on weak and overdue positions.
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-4">
              <Repeat2 className="mt-0.5 text-primary" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Retain what you learn</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Lightweight spaced repetition keeps ideas ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
