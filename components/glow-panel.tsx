"use client";

import { useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

// Big promo panel for the home page: gradient border, an orange glow that
// follows the mouse, and a one-off wobble when the pointer enters. Children
// can use `group-hover:` (e.g. animate-jiggle). Movement is off for reduced motion.
export function GlowPanel({
  children,
  className,
  glowCorner = "top-right",
}: {
  children: React.ReactNode;
  className?: string;
  glowCorner?: "top-right" | "bottom-left";
}) {
  const panel = useRef<HTMLDivElement>(null);
  // On for one wobble each time the pointer enters
  const [wobbling, setWobbling] = useState(false);

  function trackPointer(event: MouseEvent<HTMLDivElement>) {
    const rect = panel.current?.getBoundingClientRect();
    if (!rect) return;
    panel.current!.style.setProperty("--x", `${event.clientX - rect.left}px`);
    panel.current!.style.setProperty("--y", `${event.clientY - rect.top}px`);
  }

  return (
    <div
      ref={panel}
      onMouseMove={trackPointer}
      onMouseEnter={() => setWobbling(true)}
      onAnimationEnd={(event) => {
        // Ignore the children's own (looping) animations
        if (event.target === event.currentTarget) setWobbling(false);
      }}
      className={cn(
        "group relative overflow-hidden rounded-3xl bg-brand p-px",
        wobbling && "motion-safe:animate-wobble"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[calc(1.5rem-1px)] bg-card px-6 py-10 sm:px-10 sm:py-14",
          className
        )}
      >
        {/* Static glow + one that follows the pointer */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute size-72 rounded-full bg-brand opacity-20 blur-3xl",
            glowCorner === "top-right" ? "-top-24 -right-24" : "-bottom-24 -left-24"
          )}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--x, 50%) var(--y, 50%), color-mix(in oklab, var(--brand-from) 22%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
