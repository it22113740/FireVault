"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PUBLIC_NAV, SELLER_CTA } from "@/lib/nav";

const LINKS = [...PUBLIC_NAV, SELLER_CTA];

// `account` is the server-rendered account link (needs the session)
export function MobileNav({ account }: { account?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-lg" className="xl:hidden" />}
        aria-label="Open menu"
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="p-6">
        <SheetTitle className="font-heading text-lg">Menu</SheetTitle>
        <nav className="mt-2 flex flex-col font-semibold" onClick={(event) => {
          // Close after following any link, including the account link
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}>
          {account}
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center border-b text-lg"
            >
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
