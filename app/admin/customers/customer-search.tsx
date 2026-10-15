"use client";

import { useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function CustomerSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    startTransition(() => router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname));
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-sm">
      <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search name or email"
        aria-label="Search customers"
        className="h-11 pl-9"
      />
      {pending && (
        <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </form>
  );
}
