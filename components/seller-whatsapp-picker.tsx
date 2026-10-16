"use client";

import { useMemo, useState } from "react";
import { MessageCircleIcon, SearchIcon, StarIcon } from "lucide-react";
import { SellerLogo } from "@/components/seller-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";

export type ContactSeller = {
  id: string;
  name: string;
  logoUrl: string;
  whatsappNumber: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
};

// Glassy "choose a seller" window: the customer picks a shop and WhatsApp
// opens with that seller's own number (never the super admin's). Used for
// shared listings and the homepage "sell your account" button.
export function SellerWhatsAppPicker({
  sellers,
  message,
  label = "Contact via WhatsApp",
  title = "Choose a seller",
  description = "Select a seller to contact them directly on WhatsApp.",
  variant = "primary",
  disabled,
  className,
}: {
  sellers: ContactSeller[];
  message: string;
  label?: string;
  title?: string;
  description?: string;
  /** "primary" is the screen's gradient CTA; "secondary" an outlined button */
  variant?: "primary" | "secondary";
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? sellers.filter((seller) => seller.name.toLowerCase().includes(term)) : sellers;
  }, [sellers, query]);

  return (
    <>
      <Button
        size="lg"
        variant={variant === "primary" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn(
          "h-11 gap-2 text-base font-semibold transition-transform active:scale-[0.97]",
          !disabled && variant === "primary" && "bg-brand text-primary-foreground hover:opacity-90",
          !disabled && variant === "secondary" && "border-primary/40 bg-transparent text-foreground hover:bg-primary/10",
          className
        )}
      >
        {disabled ? (
          "Reserved"
        ) : (
          <>
            <MessageCircleIcon /> {label}
          </>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent
          overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-md"
          className="flex max-h-[calc(100svh-2rem)] flex-col gap-4 border border-white/15 bg-background/55 p-5 shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)] ring-white/10 backdrop-blur-2xl backdrop-saturate-150 sm:max-w-md"
        >
          <div className="flex flex-col gap-1 pr-8">
            <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>

          {sellers.length > 6 && (
            <label className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-background/40 px-3 text-sm focus-within:border-primary/60">
              <SearchIcon className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sellers"
                aria-label="Search sellers"
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
          )}

          <ul className="-mx-1 flex min-h-0 flex-col gap-2 overflow-y-auto px-1 pb-1">
            {shown.length === 0 && (
              <li className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-muted-foreground">
                {sellers.length === 0 ? "No sellers available right now." : "No sellers match your search."}
              </li>
            )}
            {shown.map((seller) => (
              <li key={seller.id}>
                {seller.whatsappNumber ? (
                  <a
                    href={whatsappUrl(seller.whatsappNumber, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="group flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-background/35 p-3 transition-all hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <SellerLogo url={seller.logoUrl} name={seller.name} className="size-11 ring-2 ring-white/15" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{seller.name}</span>
                      <Rating seller={seller} />
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-sm font-medium text-success transition-colors group-hover:bg-success group-hover:text-white">
                      <MessageCircleIcon className="size-4" /> Chat
                    </span>
                  </a>
                ) : (
                  <span className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-muted/30 p-3 text-muted-foreground">
                    <SellerLogo url={seller.logoUrl} name={seller.name} className="size-11 opacity-60" />
                    <span className="min-w-0 flex-1 truncate">{seller.name}</span>
                    <span className="text-xs">Unavailable</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Rating({ seller }: { seller: ContactSeller }) {
  if (seller.ratingAvg == null) {
    return seller.ratingCount === undefined ? null : <span className="block text-xs text-muted-foreground">New seller</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <StarIcon className="size-3.5 fill-warning text-warning" />
      <span className="font-medium text-foreground tabular-nums">{seller.ratingAvg.toFixed(1)}</span>
      ({seller.ratingCount ?? 0})
    </span>
  );
}
