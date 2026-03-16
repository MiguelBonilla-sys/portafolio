"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface AnimatedEntryProps {
  children: ReactNode;
  /** Delay in seconds before the animation starts */
  delay?: number;
  /** Custom class applied to the wrapper div */
  className?: string;
  /** Y offset to animate from (default 28px) */
  yOffset?: number;
}

/**
 * Thin client wrapper that fades + slides up an element when it enters the
 * viewport. Respects `prefers-reduced-motion` — if the user has requested
 * reduced motion the element is shown immediately with no animation.
 *
 * Keep Server Components as the parent; only wrap the leaf elements that
 * need animation with this component.
 */
export default function AnimatedEntry({
  children,
  delay = 0,
  className,
  yOffset = 28,
}: AnimatedEntryProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
