import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, type Listing } from "@/src/lib/listings";
import { createClient } from "@/src/lib/supabase/server";
import { ArchiveButton } from "./archive-button";
import { StatusBadge } from "./status-badge";

export default function ListingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Listings</h1>
        <Button render={<Link href="/admin/posts/new" />} nativeButton={false}>
          New listing
        </Button>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading listings…</p>}>
        <ListingsTable />
      </Suspense>
    </div>
  );
}

async function ListingsTable() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select("id, title, price, status, images, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-sm text-destructive">Couldn&apos;t load listings.</p>;
  }

  const listings = data as Pick<
    Listing,
    "id" | "title" | "price" | "status" | "images" | "created_at"
  >[];

  if (listings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No listings yet. Create your first one.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14" />
          <TableHead>Title</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id}>
            <TableCell>
              <div className="relative size-10 overflow-hidden rounded-md bg-muted">
                {listing.images[0] && (
                  <Image
                    src={listing.images[0]}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium">{listing.title}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatPrice(listing.price)}
            </TableCell>
            <TableCell>
              <StatusBadge status={listing.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(listing.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/admin/posts/${listing.id}/edit`} />}
                nativeButton={false}
              >
                Edit
              </Button>
              {listing.status !== "archived" && listing.status !== "reserved" && (
                <ArchiveButton id={listing.id} title={listing.title} />
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
