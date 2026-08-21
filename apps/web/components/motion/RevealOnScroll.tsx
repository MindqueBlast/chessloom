"use client";

import { motion, useReducedMotion } from "motion/react";

import { motionTokens } from "@/lib/motion/tokens";

export function RevealOnScroll({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={
        reduceMotion ? false : { opacity: 0, y: 14, filter: "blur(4px)" }
      }
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.22, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: reduceMotion ? 0 : motionTokens.durationSlow,
        delay: reduceMotion ? 0 : delay,
        ease: motionTokens.easeOut,
      }}
    >
      {children}
    </motion.div>
  );
}
