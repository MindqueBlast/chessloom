"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

export function ShareProgressCard({
  className,
  dueCount,
  streak,
  studyCount,
  weakCount,
}: {
  className?: string;
  dueCount: number;
  streak: number;
  studyCount: number;
  weakCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL ?? "https://chessloom.vercel.app");

  const message = [
    `Training openings on Chessloom this week:`,
    `• ${studyCount} ${studyCount === 1 ? "study" : "studies"}`,
    `• ${dueCount} positions due`,
    `• ${weakCount} weak paths to reinforce`,
    `• ${streak}-day streak`,
    ``,
    `Free & open source — pick a beginner opening or import your Lichess study:`,
    siteUrl,
  ].join("\n");

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      trackEvent("share_card_copied");
      toast.success("Share text copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-lg">Share your progress</CardTitle>
          <CardDescription>
            Copy a weekly update for Discord, Reddit, or LinkedIn — no public
            repertoire link required.
          </CardDescription>
        </div>
        <Share2 className="size-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <Button type="button" variant="outline" onClick={copyShare}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? "Copied" : "Copy share text"}
        </Button>
      </CardContent>
    </Card>
  );
}
