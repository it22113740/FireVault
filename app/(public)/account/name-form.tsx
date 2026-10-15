"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { updateMyName } from "@/lib/actions/settings";

export function NameForm({ defaultName }: { defaultName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("fullName") ?? "");
    startTransition(async () => {
      const result = await updateMyName(name);
      setError(result.ok ? undefined : result.error);
      if (result.ok) toast.success("Name saved.");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField
        label="Name"
        htmlFor="fullName"
        hint="Shown on reviews you post or edit from now on."
        error={error}
      >
        <Input id="fullName" name="fullName" defaultValue={defaultName} autoComplete="name" className="h-11" />
      </FormField>
      <SubmitButton size="lg" className="h-11 w-fit" pending={pending} pendingLabel="Saving…">
        Save name
      </SubmitButton>
    </form>
  );
}
