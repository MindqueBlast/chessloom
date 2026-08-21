"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  FileUp,
  GitBranch,
  Repeat2,
  Target,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  ShowcaseBoard,
  useCyclingLearnFen,
  usePracticeFlashFen,
} from "@/components/landing/ShowcaseBoard";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { motionTokens } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const PGN_SNIPPET = `[Event "Italian Game"]
1. e4 e5 2. Nf3 Nc6 3. Bc4 *`;

const LICHESS_URL = "https://lichess.org/study/abcdefgh";

function ImportDemo() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(
    reduceMotion ? PGN_SNIPPET.length : 0,
  );
  const [showLichess, setShowLichess] = useState(Boolean(reduceMotion));

  useEffect(() => {
    if (reduceMotion) {
      setVisible(PGN_SNIPPET.length);
      setShowLichess(true);
      return;
    }
    setVisible(0);
    setShowLichess(false);
    const id = window.setInterval(() => {
      setVisible((count) => {
        if (count >= PGN_SNIPPET.length) {
          window.clearInterval(id);
          setShowLichess(true);
          return count;
        }
        return count + 1;
      });
    }, 28);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/10">
        <pre className="font-mono text-xs leading-6 whitespace-pre-wrap text-muted-foreground">
          {PGN_SNIPPET.slice(0, visible)}
          {!reduceMotion && visible < PGN_SNIPPET.length ? (
            <span className="animate-pulse text-foreground">▍</span>
          ) : null}
        </pre>
      </div>
      <div
        className={cn(
          "rounded-xl bg-muted/40 px-4 py-3 font-mono text-xs text-muted-foreground ring-1 ring-foreground/10 transition-opacity",
          showLichess ? "opacity-100" : "opacity-40",
        )}
      >
        Or import a Lichess study URL
        <p className="mt-1 text-foreground/80">{LICHESS_URL}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Italian Game", "3 chapters", "42 moves"].map((chip) => (
          <Badge key={chip} variant="secondary">
            {chip}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function TreeDemo() {
  const reduceMotion = useReducedMotion();
  const branches = [
    { label: "3…Bc5", active: true },
    { label: "3…Nf6", active: false },
    { label: "3…Be7", active: false },
  ];

  return (
    <div className="space-y-3">
      <p className="font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase">
        Variation tree
      </p>
      <div className="space-y-2">
        {branches.map((branch, index) => (
          <motion.div
            key={branch.label}
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: reduceMotion ? 0 : motionTokens.duration,
              delay: reduceMotion ? 0 : index * motionTokens.stagger,
              ease: motionTokens.easeOut,
            }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1",
              branch.active
                ? "bg-primary/10 text-foreground ring-primary/25"
                : "bg-card/60 text-muted-foreground ring-foreground/8",
            )}
          >
            <GitBranch className="size-3.5 shrink-0" aria-hidden />
            <span className="font-medium">{branch.label}</span>
            {branch.active ? (
              <span className="ml-auto font-mono text-[0.65rem] tracking-wider uppercase">
                mainline
              </span>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MasteryDemo() {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? 72 : 18);

  useEffect(() => {
    if (reduceMotion) {
      setValue(72);
      return;
    }
    const id = window.setInterval(() => {
      setValue((current) => (current >= 78 ? 22 : current + 8));
    }, 900);
    return () => window.clearInterval(id);
  }, [reduceMotion]);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Repertoire mastery</span>
          <span className="font-mono text-muted-foreground">{value}%</span>
        </div>
        <Progress value={value} />
      </div>
      <div className="rounded-lg bg-muted/50 px-3 py-3 ring-1 ring-foreground/8">
        <p className="font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
          Due queue
        </p>
        <p className="mt-1 text-sm text-foreground/90">
          6 positions ready · Random Test or Full Test next
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Random Test", value: "Quiz weak lines" },
          { label: "Full Test", value: "Entire repertoire" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-muted/50 px-3 py-3 ring-1 ring-foreground/8"
          >
            <p className="font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-1 text-sm font-medium tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearnDemoPanel() {
  const fen = useCyclingLearnFen();
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ShowcaseBoard fen={fen} />
      <TreeDemo />
    </div>
  );
}

function PracticeDemoPanel() {
  const { fen, label } = usePracticeFlashFen();
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <ShowcaseBoard fen={fen} />
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Moves commit on the board immediately. Feedback follows—Continue
          advances to the next position.
        </p>
        <div className="min-h-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={label}
              initial={
                reduceMotion ? false : { opacity: 0, y: 4, filter: "blur(2px)" }
              }
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: -2, filter: "blur(2px)" }
              }
              transition={{
                duration: reduceMotion ? 0 : motionTokens.durationFast,
                ease: motionTokens.easeOut,
              }}
              className={cn(
                "font-medium",
                label === "Correct." &&
                  "text-emerald-700 dark:text-emerald-300",
              )}
            >
              {label}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  {
    id: "import",
    eyebrow: "01 · Import",
    title: "Paste a PGN or Lichess study URL.",
    body: "Your imported games become the source of truth—chapters, branches, and comments stay faithful to the file.",
    icon: FileUp,
    demo: <ImportDemo />,
  },
  {
    id: "learn",
    eyebrow: "02 · Learn",
    title: "Walk every branch with the board.",
    body: "Learn mode guides you through the tree. Opponent replies play automatically when you train one side.",
    icon: BookOpen,
    demo: <LearnDemoPanel />,
  },
  {
    id: "practice",
    eyebrow: "03 · Practice",
    title: "Drill due and weak positions.",
    body: "Practice quizzes due and weak positions. The board always shows the move you played before you continue.",
    icon: Target,
    demo: <PracticeDemoPanel />,
  },
  {
    id: "mastery",
    eyebrow: "04 · Test / Mastery",
    title: "Prove recall with Random and Full Tests.",
    body: "FSRS updates mastery and due dates from real attempts. Test mode quizzes your repertoire so retention stays honest.",
    icon: Repeat2,
    demo: <MasteryDemo />,
  },
] as const;

export function LandingShowcase() {
  return (
    <section
      id="how-it-works"
      className="mx-auto w-full max-w-6xl px-6 py-20 lg:px-8 lg:py-28"
    >
      <RevealOnScroll>
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-[0.16em] text-muted-foreground uppercase">
            How Chessloom works
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            Import, learn, practice, test.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            A focused loop for club players who already know what they want to
            study—and need the board to keep up.
          </p>
        </div>
      </RevealOnScroll>

      <div className="mt-14 space-y-10">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <RevealOnScroll key={step.id} delay={Math.min(index, 3) * 0.04}>
              <Card className="overflow-hidden bg-card/80">
                <CardHeader className="gap-4 border-b border-border/60 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <CardDescription className="flex items-center gap-2 font-mono text-xs tracking-[0.16em] uppercase">
                      <Icon className="size-3.5" aria-hidden />
                      {step.eyebrow}
                    </CardDescription>
                    <CardTitle className="max-w-xl text-2xl tracking-tight">
                      {step.title}
                    </CardTitle>
                    <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">{step.demo}</CardContent>
              </Card>
              {index < STEPS.length - 1 ? (
                <Separator className="mt-10 opacity-60" />
              ) : null}
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}
