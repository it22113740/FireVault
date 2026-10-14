import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
      <SearchXIcon className="size-10 text-muted-foreground" />
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-sm text-muted-foreground">
        This page doesn&apos;t exist, or the account was sold and removed.
      </p>
      <Button size="lg" className="h-11" render={<Link href="/accounts" />} nativeButton={false}>
        Browse accounts
      </Button>
    </div>
  );
}
