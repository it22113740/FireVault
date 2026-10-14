"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Swipeable row on mobile; arrow buttons on desktop
export function ListingCarousel({ children }: { children: React.ReactNode[] }) {
  const [viewportRef, embla] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", update).on("reInit", update);
    // Initial state comes from the carousel, an external system
    requestAnimationFrame(update);
    return () => {
      embla.off("select", update).off("reInit", update);
    };
  }, [embla, update]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden" ref={viewportRef}>
        <ul className="-ml-4 flex touch-pan-y">
          {children.map((child, index) => (
            <li key={index} className="min-w-0 shrink-0 grow-0 basis-[82%] pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
              {child}
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden justify-end gap-2 sm:flex">
        <Button variant="outline" size="icon-lg" disabled={!canPrev} onClick={() => embla?.scrollPrev()} aria-label="Previous accounts">
          <ChevronLeftIcon />
        </Button>
        <Button variant="outline" size="icon-lg" disabled={!canNext} onClick={() => embla?.scrollNext()} aria-label="More accounts">
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
