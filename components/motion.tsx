"use client";

import { motion, useReducedMotion } from "motion/react";

// PLAN.md motion rules: fade + 8px rise, 200ms ease-out, 40ms stagger, at most
// 10 items animated, opacity/transform only. Reduced motion keeps the fade.
const DURATION = 0.2;
const STAGGER = 0.04;
const MAX_STAGGERED = 10;

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// Wrap each card in a grid; pass its position for the stagger delay
export function StaggerItem({
  children,
  index,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Component = as === "li" ? motion.li : motion.div;
  // Items past the cap appear immediately so long lists don't feel slow
  const animated = index < MAX_STAGGERED;

  return (
    <Component
      className={className}
      initial={animated ? { opacity: 0, y: reduce ? 0 : 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: "easeOut", delay: index * STAGGER }}
    >
      {children}
    </Component>
  );
}
