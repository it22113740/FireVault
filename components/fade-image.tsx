"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

// Fades in over a muted placeholder once loaded (opacity only)
export function FadeImage({ className, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      onLoad={() => setLoaded(true)}
      className={cn("transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}
