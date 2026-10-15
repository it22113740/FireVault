"use client";

import { SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function AnnouncementHeading() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="flex items-center gap-3"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"
        initial={false}
        whileInView={reduce ? undefined : { rotate: [0, -12, 10, -5, 0], scale: [1, 1.15, 1] }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.9, delay: 0.15, ease: "easeInOut" }}
      >
        <SparklesIcon className="size-6" />
      </motion.span>
      <div className="relative pb-2">
        <h2 id="announcements-heading" className="bg-brand bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
          Whats New!
        </h2>
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-brand"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.3, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}
