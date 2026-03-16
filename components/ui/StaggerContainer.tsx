"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface StaggerContainerProps {
  children: ReactNode;
  /** Class applied to the container element */
  className?: string;
  /** Delay between each child animation in seconds (default 0.1) */
  staggerDelay?: number;
  /** Initial delay before the first child animates (default 0) */
  initialDelay?: number;
}

const containerVariants = (stagger: number, initialDelay: number) => ({
  hidden: {},
  visible: {
    transition: {
      delayChildren: initialDelay,
      staggerChildren: stagger,
    },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const itemVariantsReduced = {
  hidden: { opacity: 1, y: 0 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wraps a list of children and staggers their fade-in/slide-up animations
 * when the container enters the viewport.
 */
export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0,
}: StaggerContainerProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={containerVariants(staggerDelay, initialDelay)}
      initial={reduceMotion ? "visible" : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

/** Individual animated item inside a StaggerContainer */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={reduceMotion ? itemVariantsReduced : itemVariants}
    >
      {children}
    </motion.div>
  );
}
