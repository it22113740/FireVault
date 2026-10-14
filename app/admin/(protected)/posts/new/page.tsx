import { createListing } from "../actions";
import { ListingForm } from "../listing-form";

export default function NewListingPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">New listing</h1>
      <ListingForm action={createListing} />
    </div>
  );
}
