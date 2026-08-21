"use client";

import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion/tokens";

export function StaggerItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(3px)" }
      }
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: reduceMotion ? 0 : motionTokens.duration,
          delay: reduceMotion ? 0 : Math.min(index, 8) * motionTokens.stagger,
        ease: motionTokens.easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}
