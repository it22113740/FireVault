import type { Metadata } from "next";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Become a seller",
  description: "Apply to sell game accounts on FireVault.",
};

const STEPS = [
  "Send the form with a screenshot of our sellers' WhatsApp group.",
  "We review your application, usually within a day.",
  "Once approved, you get an email to set your password and start listing.",
];

export default function ApplyPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Become a seller</h1>
        <p className="mt-3 text-muted-foreground">
          List your accounts on FireVault and chat with buyers directly on WhatsApp.
        </p>
        <ol className="mt-6 flex flex-col gap-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-heading font-bold text-primary">
                {index + 1}
              </span>
              <span className="pt-1 text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <ApplyForm />
      </div>
    </div>
  );
}
