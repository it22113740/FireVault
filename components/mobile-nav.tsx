"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PUBLIC_NAV, SELLER_CTA } from "@/lib/nav";

const LINKS = [...PUBLIC_NAV, SELLER_CTA];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="md:hidden" />}
        aria-label="Open menu"
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="p-6">
        <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
        <nav className="mt-2 flex flex-col">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center border-b text-base"
            >
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
