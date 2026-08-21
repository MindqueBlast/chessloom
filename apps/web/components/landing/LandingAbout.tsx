"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import {
  ShowcaseBoard,
  useCyclingLearnFen,
} from "@/components/landing/ShowcaseBoard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { motionTokens } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const BRANCHES = [
  { label: "1. e4 e5", depth: 0 },
  { label: "2. Nf3 Nc6", depth: 1 },
  { label: "3. Bc4 Bc5", depth: 2 },
  { label: "3…Nf6", depth: 2 },
  { label: "4. c3", depth: 3 },
] as const;

export function LandingAbout() {
  const reduceMotion = useReducedMotion();
  const fen = useCyclingLearnFen();
  const [visibleCount, setVisibleCount] = useState(
    reduceMotion ? BRANCHES.length : 1,
  );

  useEffect(() => {
    if (reduceMotion) {
      setVisibleCount(BRANCHES.length);
      return;
    }
    setVisibleCount(1);
    const id = window.setInterval(() => {
      setVisibleCount((count) =>
        count >= BRANCHES.length ? BRANCHES.length : count + 1,
      );
    }, 1100);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <section
      id="why"
      className="mx-auto w-full max-w-6xl px-6 py-20 lg:px-8 lg:py-28"
    >
      <RevealOnScroll>
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="max-w-xl space-y-5">
            <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
              Why Chessloom?
            </p>
            <p className="text-lg leading-8 text-foreground/90">
              I&apos;ve played chess for almost all my life, and I wanted a
              better way to study openings.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Most opening tools felt like reading theory or clicking through
              variations. I wanted a quiz + learning loop — test whether I
              remembered my repertoire and focus on the lines I personally
              wanted to play.
            </p>
            <p className="text-base leading-7 text-foreground/90">
              So I built Chessloom.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Designed around <em>your</em> repertoire, openings, and style:
              import what you want to learn, work through it interactively,
              practice until it&apos;s second nature.
            </p>
            <p className="text-base leading-7 text-muted-foreground">
              Accessible to everyone:{" "}
              <strong className="font-medium text-foreground">
                100% free and open source
              </strong>{" "}
              — studying chess shouldn&apos;t require an expensive subscription.
            </p>
            <p className="pt-2 font-mono text-xs tracking-[0.14em] text-primary uppercase">
              Built by a chess player, for chess players.
            </p>
          </div>

          <div className="space-y-5">
            <ShowcaseBoard fen={fen} className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-xl ring-1 ring-foreground/10" />
            <div className="space-y-2">
              <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
                Your repertoire
              </p>
              {BRANCHES.slice(0, visibleCount).map((branch, index) => (
                <motion.div
                  key={branch.label}
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduceMotion ? 0 : motionTokens.duration,
                    delay: reduceMotion ? 0 : index * 0.04,
                    ease: motionTokens.easeOut,
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-foreground/8",
                    index === visibleCount - 1
                      ? "bg-primary/10 text-foreground"
                      : "bg-card/50 text-muted-foreground",
                  )}
                  style={{ marginLeft: `${branch.depth * 0.75}rem` }}
                >
                  <GitBranch className="size-3.5 shrink-0" aria-hidden />
                  {branch.label}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
