"use client";

import { ArrowRight, Network, Repeat2, Target } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

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
import { motionTokens } from "@/lib/motion/tokens";

export function LandingHero() {
  const reduceMotion = useReducedMotion();
  const enter = (delay: number) =>
    reduceMotion
      ? { duration: 0 }
      : {
          duration: motionTokens.durationSlow,
          delay,
          ease: motionTokens.easeOut,
        };

  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
      <div className="flex flex-col items-start gap-7">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enter(0)}
        >
          <Badge variant="outline">Repertoire intelligence</Badge>
        </motion.div>
        <motion.div
          className="flex flex-col gap-5"
          initial={
            reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(3px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={enter(0.05)}
        >
          <h1 className="max-w-3xl text-5xl leading-[0.96] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
            Weave opening knowledge into instinct.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Build a living repertoire, understand every branch, and train the
            positions that need your attention.
          </p>
        </motion.div>
        <motion.div
          className="flex flex-wrap items-center gap-3"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={enter(0.1)}
        >
          <Button asChild size="lg">
            <Link href="/signup">
              Start building
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={
          reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(4px)" }
        }
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={enter(0.12)}
      >
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
                  FSRS scheduling keeps ideas ready.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
