"use client";

import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion/tokens";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : { opacity: 0, y: 6, filter: "blur(2px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: reduceMotion ? 0 : motionTokens.duration,
        ease: motionTokens.easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}
