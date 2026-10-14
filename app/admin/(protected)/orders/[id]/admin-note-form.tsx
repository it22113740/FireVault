"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { NoteState } from "../actions";

type AdminNoteFormProps = {
  action: (state: NoteState, formData: FormData) => Promise<NoteState>;
  note: string | null;
};

export function AdminNoteForm({ action, note }: AdminNoteFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);

  // Submit manually so React doesn't reset the textarea to the old note
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        name="note"
        rows={4}
        maxLength={2000}
        defaultValue={note ?? ""}
        placeholder="Private notes, e.g. payment reference, delivery details…"
        aria-label="Admin note"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save note"}
        </Button>
        {state?.saved && !pending && <span className="text-sm text-muted-foreground">Saved</span>}
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
