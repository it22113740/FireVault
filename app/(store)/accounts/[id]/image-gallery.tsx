"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, Gamepad2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [[index, direction], setSlide] = useState([0, 0]);
  const touchStartX = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const count = images.length;

  if (count === 0) {
    return (
      <div className="flex aspect-video items-center justify-center border bg-muted">
        <Gamepad2Icon className="size-12 text-muted-foreground" />
      </div>
    );
  }

  function go(next: number, dir: number) {
    setSlide([((next % count) + count) % count, dir]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-video overflow-hidden border bg-muted"
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1), delta < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        {reduce ? (
          <Image
            src={images[index]}
            alt={`${title}, image ${index + 1} of ${count}`}
            fill
            sizes="(min-width: 1024px) 640px, 100vw"
            className="object-cover"
          />
        ) : (
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={images[index]}
              className="absolute inset-0"
              initial={{ opacity: 0, x: direction * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -28 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Image
                src={images[index]}
                alt={`${title}, image ${index + 1} of ${count}`}
                fill
                sizes="(min-width: 1024px) 640px, 100vw"
                priority={index === 0}
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
        )}
        {count > 1 && (
          <>
            <GalleryArrow side="left" onClick={() => go(index - 1, -1)} />
            <GalleryArrow side="right" onClick={() => go(index + 1, 1)} />
            <span className="absolute right-2 bottom-2 z-10 rounded-md bg-background/80 px-2 py-0.5 text-xs tabular-nums">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (i !== index) go(i, i > index ? 1 : -1);
                }}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block aspect-video w-20 overflow-hidden rounded-md border-2 transition sm:w-24",
                  i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <Image src={url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 backdrop-blur transition hover:bg-background",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
