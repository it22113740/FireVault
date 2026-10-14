import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";

type WhatsAppButtonProps = {
  number: string | null | undefined;
  message?: string;
  label?: string;
  disabledLabel?: string;
  disabled?: boolean;
  className?: string;
  size?: "default" | "lg";
  // "primary" is the screen's one gradient CTA; "secondary" for repeated cards
  variant?: "primary" | "secondary";
};

// The one primary CTA on public screens: orange gradient, ≥44px tap target
export function WhatsAppButton({
  number,
  message,
  label = "Buy on WhatsApp",
  disabledLabel = "Reserved",
  disabled,
  className,
  size = "lg",
  variant = "primary",
}: WhatsAppButtonProps) {
  const enabled = !disabled && !!number;
  const classes = cn(
    "h-11 gap-2 text-base font-semibold transition-transform active:scale-[0.97]",
    enabled && variant === "primary" && "bg-brand text-primary-foreground hover:opacity-90",
    enabled && variant === "secondary" && "border-primary/40 bg-transparent text-foreground hover:bg-primary/10",
    className
  );

  if (!enabled) {
    return (
      <Button size={size} disabled className={classes}>
        {disabled ? disabledLabel : "Contact unavailable"}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant === "secondary" ? "outline" : "default"}
      className={classes}
      nativeButton={false}
      render={<a href={whatsappUrl(number!, message)} target="_blank" rel="noopener noreferrer" />}
    >
      <MessageCircleIcon className="size-5" aria-hidden />
      {label}
    </Button>
  );
}
