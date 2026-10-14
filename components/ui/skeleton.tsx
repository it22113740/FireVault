import { cn } from "cn"

// Left-to-right shimmer; the sweep is decorative, so it stops for reduced motion
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:animate-shimmer after:bg-linear-to-r after:from-transparent after:via-white/5 after:to-transparent motion-reduce:after:hidden",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
