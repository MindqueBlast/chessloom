"use client";

import dynamic from "next/dynamic";

import { PlayOnLichessButton } from "@/components/training/PlayOnLichessButton";
import { Skeleton } from "@/components/ui/skeleton";

const AnalysisPanel = dynamic(
  () =>
    import("@/components/engine/AnalysisPanel").then(
      (mod) => mod.AnalysisPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-2 rounded-xl border bg-card p-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-full" />
      </div>
    ),
  },
);

export function LazyAnalysisPanel({
  fen,
  color,
}: {
  fen: string;
  color?: "white" | "black";
}) {
  return (
    <div className="space-y-2">
      <AnalysisPanel fen={fen} />
      <PlayOnLichessButton fen={fen} color={color} />
    </div>
  );
}
