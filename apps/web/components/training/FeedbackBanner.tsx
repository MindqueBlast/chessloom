"use client";

import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motionTokens } from "@/lib/motion/tokens";
import { PRACTICE_INCORRECT_COPY } from "@/lib/training/ui";
import { cn } from "@/lib/utils";

export type FeedbackKind = "correct" | "incorrect" | "info" | "error";

export function FeedbackBanner({
  kind,
  title,
  description,
  animate = true,
}: {
  kind: FeedbackKind | null;
  title?: string;
  description?: string;
  animate?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = kind === "correct" ? CircleCheck : kind === "info" ? Info : CircleAlert;
  const defaultTitle =
    kind === "correct"
      ? "Correct."
      : kind === "incorrect"
        ? PRACTICE_INCORRECT_COPY
        : kind === "error"
          ? "Something went wrong."
          : "";

  return (
    <div className="min-h-18" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {kind ? (
          <motion.div
            key={`${kind}-${title ?? defaultTitle}-${description ?? ""}`}
            initial={
              animate && !reduceMotion
                ? { opacity: 0, y: 6, filter: "blur(3px)" }
                : false
            }
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={
              animate && !reduceMotion
                ? { opacity: 0, y: -3, filter: "blur(2px)" }
                : undefined
            }
            transition={{
              duration: reduceMotion ? 0 : motionTokens.durationFast,
              ease: motionTokens.easeOut,
            }}
          >
            <Alert
              variant={kind === "error" ? "destructive" : "default"}
              className={cn(
                kind === "correct" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                kind === "incorrect" &&
                  "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
              )}
            >
              <Icon />
              <AlertTitle>{title ?? defaultTitle}</AlertTitle>
              {description ? (
                <AlertDescription className="text-current/75">
                  {description}
                </AlertDescription>
              ) : null}
            </Alert>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
