"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { GameUpdate } from "@/lib/game-updates";
import { cn } from "@/lib/utils";

// Newest update large, the rest in a grid; any of them opens a full-screen
// viewer that steps through all updates (buttons, arrow keys or swipe)
export function UpdatesGallery({ updates }: { updates: GameUpdate[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [latest, ...older] = updates;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(0)}
        className="group relative block overflow-hidden rounded-2xl border bg-card text-left shadow-[0_24px_60px_-32px_var(--brand-from)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={`Open the latest update, posted ${formatDate(latest.createdAt)}`}
      >
        <Poster update={latest} priority sizes="(min-width: 1152px) 1152px, 100vw" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-linear-to-t from-black/75 to-transparent p-4 pt-16 sm:p-6">
          <span className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-bold text-primary-foreground">
            <SparklesIcon className="size-3.5" /> Latest
          </span>
          <span className="text-sm font-medium text-white/90">{formatDate(latest.createdAt)}</span>
        </div>
      </button>

      {older.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Earlier updates</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {older.map((update, index) => (
              <StaggerItem key={update.id} index={index} as="li">
                <button
                  type="button"
                  onClick={() => setOpen(index + 1)}
                  className="group block w-full overflow-hidden rounded-xl border bg-card text-left transition duration-200 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hover:-translate-y-1"
                  aria-label={`Open the update posted ${formatDate(update.createdAt)}`}
                >
                  <Poster update={update} sizes="(min-width: 1024px) 370px, (min-width: 640px) 50vw, 100vw" />
                  <p className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(update.createdAt)}</p>
                </button>
              </StaggerItem>
            ))}
          </ul>
        </section>
      )}

      <Viewer updates={updates} index={open} onIndexChange={setOpen} />
    </>
  );
}

// Every update sits in the same 16:9 frame (1920 × 1080); a poster of another
// shape is shown whole, never cropped
function Poster({ update, priority, sizes }: { update: GameUpdate; priority?: boolean; sizes: string }) {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted">
      <Image
        src={update.imageUrl}
        alt={`Game update posted ${formatDate(update.createdAt)}`}
        fill
        priority={priority}
        sizes={sizes}
        className="object-contain transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </div>
  );
}

function Viewer({
  updates,
  index,
  onIndexChange,
}: {
  updates: GameUpdate[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const count = updates.length;
  const go = useCallback(
    (step: number) => {
      if (index === null) return;
      onIndexChange((index + step + count) % count);
    },
    [index, count, onIndexChange]
  );

  useEffect(() => {
    if (index === null || count < 2) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, count, go]);

  const update = index === null ? null : updates[index];

  return (
    <Dialog open={index !== null} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent className="max-w-[min(96vw,1600px)] gap-3 bg-black p-2 text-white ring-white/10 sm:max-w-[min(96vw,1600px)] sm:p-3">
        <DialogTitle className="sr-only">
          Update {index === null ? "" : index + 1} of {count}
        </DialogTitle>
        {update && (
          <div
            className="relative aspect-video w-full"
            onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchStart.current === null) return;
              const delta = event.changedTouches[0].clientX - touchStart.current;
              touchStart.current = null;
              if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
            }}
          >
            <Image
              key={update.id}
              src={update.imageUrl}
              alt={`Game update posted ${formatDate(update.createdAt)}`}
              fill
              sizes="96vw"
              className="object-contain"
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-1">
          <span className="text-sm text-white/70">{update && formatDate(update.createdAt)}</span>
          {count > 1 && (
            <div className="flex items-center gap-2">
              <NavButton label="Previous update" onClick={() => go(-1)}>
                <ChevronLeftIcon />
              </NavButton>
              <span className="w-14 text-center text-sm tabular-nums text-white/70">
                {(index ?? 0) + 1} / {count}
              </span>
              <NavButton label="Next update" onClick={() => go(1)}>
                <ChevronRightIcon />
              </NavButton>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      onClick={onClick}
      aria-label={label}
      className={cn("size-11 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white")}
    >
      {children}
    </Button>
  );
}
