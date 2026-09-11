"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { importStarterOpeningAction } from "@/lib/actions/studies";
import { trackEvent } from "@/lib/analytics/track";
import {
  STARTER_OPENINGS,
  type StarterLevel,
  type StarterOpening,
} from "@/lib/openings/starter-catalog";
import { toastCopy } from "@/lib/toasts";
import { cn } from "@/lib/utils";

function levelLabel(level: StarterLevel) {
  return level === "beginner" ? "Beginner" : "Club";
}

function OpeningCard({
  opening,
  highlighted,
  pendingId,
  onImport,
}: {
  opening: StarterOpening;
  highlighted: boolean;
  pendingId: string | null;
  onImport: (id: string) => void;
}) {
  const busy = pendingId === opening.id;

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        highlighted && "ring-2 ring-primary/60",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{levelLabel(opening.level)}</Badge>
          {highlighted ? (
            <Badge variant="secondary">Recommended</Badge>
          ) : null}
        </div>
        <CardTitle className="text-base">{opening.title}</CardTitle>
        <CardDescription>{opening.blurb}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button
          className="w-full"
          disabled={pendingId !== null}
          onClick={() => onImport(opening.id)}
          type="button"
        >
          {busy ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {busy ? "Importing…" : "Start training"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function StarterOpeningPicker({
  className,
  highlightedId,
}: {
  className?: string;
  highlightedId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlight =
    highlightedId ?? searchParams.get("starter") ?? "italian-beginner";
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleImport(starterId: string) {
    setPendingId(starterId);
    startTransition(async () => {
      const result = await importStarterOpeningAction(starterId);
      if (!result.ok) {
        toast.error(result.error || toastCopy.pgnParseFailed);
        setPendingId(null);
        return;
      }

      trackEvent("starter_imported", { starter_id: starterId });
      trackEvent("import_succeeded", { source: "starter" });
      toast.success(toastCopy.studyImported);
      router.push(`/studies/${result.studyId}/learn`);
    });
  }

  const beginners = STARTER_OPENINGS.filter((o) => o.level === "beginner");
  const club = STARTER_OPENINGS.filter((o) => o.level === "club");

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        <p className="font-mono text-xs tracking-[0.16em] text-primary uppercase">
          Start with an opening
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          Pick a curated Lichess study
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          One click imports a public study and drops you into Learn. You can
          always import your own repertoire below.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Beginner</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {beginners.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              highlighted={opening.id === highlight}
              pendingId={pending ? pendingId : null}
              onImport={handleImport}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Club</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {club.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              highlighted={opening.id === highlight}
              pendingId={pending ? pendingId : null}
              onImport={handleImport}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
