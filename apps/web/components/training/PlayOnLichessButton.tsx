"use client";

import { ExternalLink } from "lucide-react";
import { buildLichessPlayAiUrl } from "@chessloom/chess-core";

import { Button } from "@/components/ui/button";

export function PlayOnLichessButton({
  fen,
  color,
}: {
  fen: string;
  color?: "white" | "black";
}) {
  if (!fen) return null;
  const href = buildLichessPlayAiUrl(fen, color);
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
        Play vs computer on Lichess
      </a>
    </Button>
  );
}
