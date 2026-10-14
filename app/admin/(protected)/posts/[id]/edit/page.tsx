import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import type { Listing } from "@/src/lib/listings";
import { createClient } from "@/src/lib/supabase/server";
import { updateListing } from "../../actions";
import { ListingForm } from "../../listing-form";

type Params = PageProps<"/admin/posts/[id]/edit">["params"];

export default function EditListingPage({ params }: PageProps<"/admin/posts/[id]/edit">) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit listing</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading listing…</p>}>
        <EditListing params={params} />
      </Suspense>
    </div>
  );
}

async function EditListing({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).single();
  if (!data) notFound();

  return <ListingForm action={updateListing.bind(null, id)} listing={data as Listing} />;
}
