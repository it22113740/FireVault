"use client";

import { useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import { FadeImage } from "@/components/fade-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LISTING_IMAGE_SIZE } from "@/lib/listings";
import { cn } from "@/lib/utils";

const ZOOM = 2.5;

// Full, uncropped listing image. Tap to open full screen; there, tap a spot
// to zoom in on it (drag/scroll to pan) and tap again to zoom back out.
export function ZoomableImage({ src, alt, dimmed }: { src: string; alt: string; dimmed?: boolean }) {
  const [open, setOpen] = useState(false);
  // Zoomed width in px, or null when the image fits the screen
  const [zoomWidth, setZoomWidth] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);

  function zoomTo(width: number | null, focusX = 0.5, focusY = 0.5) {
    setZoomWidth(width);
    // Discrete events commit before the next frame, so the new size is laid out
    requestAnimationFrame(() => {
      const el = scroller.current;
      if (!el || width === null) return;
      el.scrollLeft = focusX * el.scrollWidth - el.clientWidth / 2;
      el.scrollTop = focusY * el.scrollHeight - el.clientHeight / 2;
    });
  }

  function handleImageClick(event: MouseEvent<HTMLImageElement>) {
    if (zoomWidth !== null) return zoomTo(null);
    const rect = event.currentTarget.getBoundingClientRect();
    zoomTo(
      rect.width * ZOOM,
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height
    );
  }

  function zoomInCentered() {
    const width = image.current?.getBoundingClientRect().width;
    if (width) zoomTo(width * ZOOM);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        // 3500 × 5200 frame, narrowed so its height stays within 80% of the screen
        className="group relative mx-auto block aspect-[35/52] w-full max-w-[calc(80svh*35/52)] cursor-zoom-in overflow-hidden rounded-2xl border bg-muted md:self-start"
        aria-label={`Zoom image: ${alt}`}
      >
        <FadeImage
          src={src}
          alt={alt}
          fill
          priority
          sizes="(min-width: 768px) 600px, 100vw"
          className={cn("object-contain", dimmed && "opacity-70 grayscale")}
        />
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-medium backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <ZoomInIcon className="size-3.5" /> Tap to zoom
        </span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setZoomWidth(null);
        }}
      >
        <DialogContent className="h-svh w-screen max-w-none rounded-none bg-black/95 p-0 ring-0 sm:max-w-none [&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:bg-background/80">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div ref={scroller} className="size-full overflow-auto overscroll-contain">
            <div className="flex min-h-full min-w-full items-center justify-center">
              <Image
                ref={image}
                src={src}
                alt={alt}
                width={LISTING_IMAGE_SIZE.width}
                height={LISTING_IMAGE_SIZE.height}
                sizes="100vw"
                onClick={handleImageClick}
                style={zoomWidth ? { width: zoomWidth, maxWidth: "none", maxHeight: "none" } : undefined}
                className={cn(
                  "h-auto select-none",
                  zoomWidth ? "cursor-zoom-out" : "max-h-svh w-auto max-w-full cursor-zoom-in object-contain"
                )}
                draggable={false}
              />
            </div>
          </div>
          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 gap-2">
            <Button
              variant="secondary"
              size="icon-lg"
              className="size-11"
              onClick={() => zoomTo(null)}
              disabled={zoomWidth === null}
              aria-label="Zoom out"
            >
              <ZoomOutIcon />
            </Button>
            <Button
              variant="secondary"
              size="icon-lg"
              className="size-11"
              onClick={zoomInCentered}
              disabled={zoomWidth !== null}
              aria-label="Zoom in"
            >
              <ZoomInIcon />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
